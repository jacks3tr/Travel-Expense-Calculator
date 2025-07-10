import json
import os
import re
import tkinter as tk
from tkinter import messagebox, filedialog
import customtkinter as ctk
from customtkinter import CTkFont
import logging

# Set up logging
logging.basicConfig(filename='travel_expense_calculator.log', level=logging.ERROR, 
                    format='%(asctime)s - %(levelname)s - %(message)s')

# =============================================================================
# Core calculation logic
# =============================================================================
def calculate_event_budget(avg_flight: float, car_daily: float, hotel_nightly: float,
                           hourly_comm: float, food_daily: float, seasonal_var: float,
                           round_trip_hours: float, num_cars: float, trip: float, days: float, people: float) -> tuple[float, float, float, float]:
    """
    Compute costs for one event based on inputs.
    Returns: total_budget, commute_cost, other_expenses, seasonal_variance
    """
    flights      = avg_flight    * people * trip
    car_rental   = car_daily     * days   * num_cars
    hotel        = hotel_nightly * people * days
    food         = food_daily    * people * days
    commute_cost = hourly_comm   * round_trip_hours * people

    other_expenses    = flights + car_rental + hotel + food
    seasonal_variance = other_expenses * seasonal_var
    total_budget      = other_expenses + seasonal_variance + commute_cost

    return total_budget, commute_cost, other_expenses, seasonal_variance


# =============================================================================
# Main application class
# =============================================================================
class BudgetCalculatorApp(ctk.CTk):
    # Validation regex patterns
    NUMERIC_RE = re.compile(r'^$|^\d*\.?\d*$')
    INT_RE     = re.compile(r'^$|^\d+$')
    # JSON keys for events
    JSON_EVENT_KEYS = ['name', 'trips', 'days', 'people', 'cars', 'hours']

    def __init__(self):
        super().__init__()
        self.title("Travel Expense Calculator")
        self.geometry("950x750")
        self.minsize(900, 650)
        ctk.set_appearance_mode("light")
        ctk.set_default_color_theme("blue")

        # Internal state
        self._loading: bool = False
        self._rates_visible: bool = True
        self.calc_id = None  # For debounce
        self.default_border_color = ctk.ThemeManager.theme["CTkEntry"]["border_color"]
        self.detail_labels = []  # List of lists for row labels
        self.normal_font = CTkFont()
        self.bold_font = CTkFont(weight='bold')
        self.tooltip = None

        # Build UI
        self._make_menu()
        self._make_layout()
        self._make_rates_section()
        self._make_events_section()
        self._make_summary_section()

        # Configure resizing
        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(0, weight=1)
        self._poll_tab()

    def _poll_tab(self) -> None:
        current = self.notebook.get()
        if current == 'Summary':
            self.copy_summary_btn.configure(text='Copy Summary')
        else:
            self.copy_summary_btn.configure(text='Copy Details')
        self.after(500, self._poll_tab)

    # =============================================================================
    # Theme switcher (CustomTkinter handles light/dark)
    # =============================================================================
    def _set_theme(self, mode: str) -> None:
        ctk.set_appearance_mode(mode)

    # =============================================================================
    # Menu creation with Theme submenu above Exit
    # =============================================================================
    def _make_menu(self) -> None:
        menubar = tk.Menu(self)
        filemenu = tk.Menu(menubar, tearoff=False)
        filemenu.add_command(label='Save…', accelerator='Ctrl+S', command=self._save)
        filemenu.add_command(label='Load…', accelerator='Ctrl+O', command=self._load)
        # Theme submenu
        theme_menu = tk.Menu(filemenu, tearoff=False)
        theme_menu.add_command(label='Light Mode', command=lambda: self._set_theme('light'))
        theme_menu.add_command(label='Dark Mode',  command=lambda: self._set_theme('dark'))
        filemenu.add_cascade(label='Theme', menu=theme_menu)
        filemenu.add_separator()
        filemenu.add_command(label='Exit', command=self.quit)
        menubar.add_cascade(label='File', menu=filemenu)
        self.config(menu=menubar)
        self.bind_all('<Control-s>', lambda e: self._save())
        self.bind_all('<Control-o>', lambda e: self._load())

    # =============================================================================
    # Layout containers
    # =============================================================================
    def _make_layout(self) -> None:
        self.rates_container = ctk.CTkFrame(self)
        self.rates_container.grid(row=0, column=0, sticky='nsew', padx=10, pady=(10,5))
        self.events_frame    = ctk.CTkFrame(self, corner_radius=10)
        self.events_frame.grid(row=1, column=0, sticky='nsew', padx=10, pady=5)
        self.summary_frame   = ctk.CTkFrame(self)
        self.summary_frame.grid(row=2, column=0, sticky='ew', padx=10, pady=(5,10))

    # =============================================================================
    # Rates input section
    # =============================================================================
    def _make_rates_section(self) -> None:
        header = ctk.CTkFrame(self.rates_container)
        header.pack(fill='x', pady=(0,5))
        ctk.CTkLabel(header, text='Rates', font=('Segoe UI',12,'bold')).pack(side='left')
        hide_btn = ctk.CTkButton(header, text='Hide Rates', width=120, command=self._toggle_rates, corner_radius=8)
        hide_btn.pack(side='right')
        self._rates_toggle_btn = hide_btn

        self.rates_frame = ctk.CTkFrame(self.rates_container, corner_radius=10)
        self.rates_frame.pack(fill='x')
        specs = [
            ('Average Flight Cost','1000',self._validate_numeric,'avg_flight'),
            ('Car Rental Daily','60',self._validate_numeric,'car_daily'),
            ('Hotel Room Nightly','250',self._validate_numeric,'hotel_nightly'),
            ('Hourly Commute ($/hr)','150',self._validate_numeric,'hourly_comm'),
            ('Food per Day','100',self._validate_numeric,'food_daily'),
            ('Seasonal Variance (%)','10',self._validate_numeric,'seasonal_var'),
        ]
        self.rate_vars: dict[str, tk.StringVar] = {}
        for idx,(label,default,validator,key) in enumerate(specs):
            r,c = divmod(idx,2)
            ctk.CTkLabel(self.rates_frame, text=f"{label}:").grid(row=r, column=c*2, sticky='e', padx=5, pady=6)
            var = tk.StringVar(value=default)
            vcmd = (self.register(validator), '%P')
            entry = ctk.CTkEntry(self.rates_frame, textvariable=var, width=140, validate='key', validatecommand=vcmd, corner_radius=10)
            entry.grid(row=r, column=c*2+1, sticky='w', padx=5, pady=6)
            entry.bind('<FocusOut>', self._debounce_calculate)
            self.rate_vars[key] = var
        for col in range(4): self.rates_frame.columnconfigure(col, weight=1)

    def _toggle_rates(self) -> None:
        if self._rates_visible:
            self.rates_frame.pack_forget()
            self._rates_toggle_btn.configure(text='Show Rates')
        else:
            self.rates_frame.pack(fill='x')
            self._rates_toggle_btn.configure(text='Hide Rates')
        self._rates_visible = not self._rates_visible

    # =============================================================================
    # Event grid helpers (checkbox + entries)
    # =============================================================================
    def _add_event_row(self, values: list[str] | None = None) -> None:
        idx = len(self.entry_rows) + 1
        event_specs = [
            ('name', None, ''),
            ('trips', self._validate_numeric, '1'),
            ('days', self._validate_numeric, '1'),
            ('people', self._validate_int, '1'),
            ('cars', self._validate_int, '1'),
            ('hours', self._validate_numeric, '16')
        ]
        defaults = [spec[2] for spec in event_specs]
        vals = values or defaults
        sel_var = tk.BooleanVar()
        cb = ctk.CTkCheckBox(self.entry_frame, text='', variable=sel_var, width=20)
        cb.grid(row=idx, column=0, sticky='nsew', padx=1, pady=1)
        self.select_vars.append(sel_var)
        row_entries = []
        for col, val in enumerate(vals, start=1):
            spec = event_specs[col-1]
            validator = spec[1]
            if validator:
                vcmd = (self.register(validator), '%P')
                e = ctk.CTkEntry(self.entry_frame, width=100 if col > 1 else 200, validate='key', validatecommand=vcmd, corner_radius=5)
            else:
                e = ctk.CTkEntry(self.entry_frame, width=200, corner_radius=5)
            e.insert(0, val)
            e.grid(row=idx, column=col, sticky='nsew', padx=1, pady=1)
            e.bind('<Tab>', self._focus_next)
            e.bind('<Return>', self._focus_down)
            e.bind('<FocusOut>', self._debounce_calculate)
            row_entries.append(e)
        self.entry_rows.append(row_entries)

    def _focus_next(self, event: tk.Event) -> str:
        event.widget.tk_focusNext().focus()
        return 'break'

    def _focus_down(self, event: tk.Event) -> str:
        w = event.widget
        for i,row in enumerate(self.entry_rows):
            if w in row:
                if i == len(self.entry_rows) - 1:
                    self._add_event_row()
                self.entry_rows[i+1][row.index(w)].focus()
                break
        return 'break'

    # =============================================================================
    # Events section with Add/Delete/Copy
    # =============================================================================
    def _make_events_section(self) -> None:
        toolbar = ctk.CTkFrame(self.events_frame)
        toolbar.grid(row=0, column=0, sticky='ew', pady=(0,5))
        ctk.CTkButton(toolbar, text='Add Row', command=self._add_event_row, corner_radius=8).pack(side='left', padx=5)
        ctk.CTkButton(toolbar, text='Delete Selected', command=self._delete_selected, corner_radius=8).pack(side='left', padx=5)
        self.copy_events_btn = ctk.CTkButton(toolbar, text='Copy Events', command=self._copy_events, corner_radius=8)
        self.copy_events_btn.pack(side='left', padx=5)

        self.entry_frame = ctk.CTkScrollableFrame(self.events_frame, label_text='Event Details')
        self.entry_frame.grid(row=1, column=0, sticky='nsew')
        self.events_frame.rowconfigure(1, weight=1)
        self.events_frame.columnconfigure(0, weight=1)

        # Header row
        ctk.CTkLabel(self.entry_frame, text='Select', anchor='center').grid(row=0, column=0, sticky='nsew', padx=1, pady=1)
        for j,h in enumerate(self.JSON_EVENT_KEYS, start=1):
            label = ctk.CTkLabel(self.entry_frame, text=h.capitalize(), anchor='center')
            label.grid(row=0, column=j, sticky='nsew', padx=1, pady=1)
            if h == 'trips':
                label.bind("<Enter>", lambda e, txt="Trips: Rarely changed from 1, only increased when multiple round trips are needed for a single event. Assumes days, people, cars, hours are the same for all trips; if different, use multiple events.": self._show_tooltip(e, txt))
                label.bind("<Leave>", self._hide_tooltip)
        self.entry_frame.columnconfigure(0, weight=0)
        for j in range(1, len(self.JSON_EVENT_KEYS)+1): self.entry_frame.columnconfigure(j, weight=1)
        self.select_vars: list[tk.BooleanVar] = []
        self.entry_rows: list[list[ctk.CTkEntry]] = []
        self._add_event_row()

    def _show_tooltip(self, event, text) -> None:
        x = event.widget.winfo_rootx() + 25
        y = event.widget.winfo_rooty() + event.widget.winfo_height() + 5
        self.tooltip = ctk.CTkToplevel()
        self.tooltip.wm_overrideredirect(True)
        self.tooltip.wm_geometry(f"+{x}+{y}")
        label = ctk.CTkLabel(self.tooltip, text=text, justify='left', padx=10, pady=5, wraplength=400)
        label.pack()

    def _hide_tooltip(self, event) -> None:
        if self.tooltip:
            self.tooltip.destroy()
            self.tooltip = None

    def _delete_selected(self) -> None:
        for i in reversed(range(len(self.select_vars))):
            if self.select_vars[i].get():
                for widget in self.entry_frame.grid_slaves(row=i+1):
                    widget.destroy()
                self.select_vars.pop(i)
                self.entry_rows.pop(i)
        # Re-grid remaining
        for r,var in enumerate(self.select_vars, start=1):
            cb = ctk.CTkCheckBox(self.entry_frame, text='', variable=var, width=20)
            cb.grid(row=r, column=0, sticky='nsew', padx=1, pady=1)
            for c,e in enumerate(self.entry_rows[r-1], start=1): e.grid(row=r, column=c)

    def _copy_events(self) -> None:
        headers = [h.capitalize() for h in self.JSON_EVENT_KEYS]
        lines = ['\t'.join(headers)]
        for entries in self.entry_rows:
            vals = [e.get() for e in entries]
            if vals[0].strip():
                lines.append('\t'.join(vals))
        text = '\n'.join(lines)
        self.clipboard_clear()
        self.clipboard_append(text)
        self.copy_events_btn.configure(text='Copied!')
        self.after(2000, lambda: self.copy_events_btn.configure(text='Copy Events'))

    # =============================================================================
    # Summary & Details
    # =============================================================================
    def _make_summary_section(self) -> None:
        toolbar = ctk.CTkFrame(self.summary_frame)
        toolbar.pack(fill='x')
        self.calculate_btn = ctk.CTkButton(toolbar, text='Calculate', command=self._calculate, corner_radius=8)
        self.calculate_btn.pack(side='left', padx=5)
        self.copy_summary_btn = ctk.CTkButton(toolbar, text='Copy Summary/Details', command=self._copy_summary_details, corner_radius=8)
        self.copy_summary_btn.pack(side='right')
        self.notebook = ctk.CTkTabview(self.summary_frame)
        self.notebook.pack(fill='both', expand=True)

        summary_tab = self.notebook.add('Summary')
        self.output = ctk.CTkTextbox(summary_tab, height=150, wrap='word')
        self.output.pack(fill='x', padx=5, pady=(0,5))
        self.output.configure(state='disabled')

        details_tab = self.notebook.add('Details')
        self.detail_frame = ctk.CTkScrollableFrame(details_tab)
        self.detail_frame.pack(fill='both', expand=True)
        # For details, use grid of labels instead of Treeview for consistency
        self._update_details_headers()

    def _update_details_headers(self) -> None:
        dcols = ['Event','Flight','Car','Hotel','Food','Commute','Variance','Total']
        for c, text in enumerate(dcols):
            ctk.CTkLabel(self.detail_frame, text=text, anchor='center').grid(row=0, column=c, sticky='nsew', padx=5, pady=2)
        for c in range(len(dcols)):
            self.detail_frame.columnconfigure(c, weight=1)

    def _copy_summary_details(self) -> None:
        current_tab = self.notebook.get()
        if current_tab == 'Summary':
            text = self.output.get('0.0', 'end').strip()
            btn_text = 'Copy Summary'
        else:
            lines = []
            cols, rows = self.detail_frame.grid_size()
            for r in range(rows):
                row_vals = []
                for c in range(cols):
                    slaves = self.detail_frame.grid_slaves(row=r, column=c)
                    if slaves:
                        row_vals.append(slaves[0].cget('text'))
                if row_vals:
                    lines.append('\t'.join(row_vals))
            text = '\n'.join(lines)
            btn_text = 'Copy Details'
        self.clipboard_clear()
        self.clipboard_append(text)
        self.copy_summary_btn.configure(text='Copied!')
        self.after(2000, lambda: self.copy_summary_btn.configure(text=btn_text))

    # =============================================================================
    # Validation
    # =============================================================================
    def _validate_numeric(self, P: str) -> bool: return bool(self.NUMERIC_RE.match(P))
    def _validate_int(self, P: str) -> bool:     return bool(self.INT_RE.match(P))

    # =============================================================================
    # Debounce for auto-calculate
    # =============================================================================
    def _debounce_calculate(self, event: tk.Event | None = None) -> None:
        if self.calc_id:
            self.after_cancel(self.calc_id)
        self.calc_id = self.after(300, self._calculate)

    # =============================================================================
    # Calculation & Save/Load
    # =============================================================================
    def _calculate(self) -> None:
        try:
            rates = {k: float(v.get()) for k,v in self.rate_vars.items()}
            s = rates['seasonal_var'] / 100.0
            events = []
            invalid = False
            for entries in self.entry_rows:
                ev, tr, da, pp, cr, hr = [e.get() for e in entries]
                if not ev.strip(): continue
                t, d, p, c, h = map(lambda x: float(x or 0), [tr, da, pp, cr, hr])
                # Range checks
                if p < 1 or d < 0 or t < 0 or c < 0 or h < 0:
                    invalid = True
                    for e in entries[1:]: e.configure(border_color='red')
                    continue
                else:
                    for e in entries[1:]: e.configure(border_color=self.default_border_color)
                flight = rates['avg_flight'] * p * t
                car_cost = rates['car_daily'] * d * c
                hotel = rates['hotel_nightly'] * p * d
                food = rates['food_daily'] * p * d
                commute = rates['hourly_comm'] * h * p
                other = flight + car_cost + hotel + food
                var = other * s
                total = other + var + commute
                events.append((ev, flight, car_cost, hotel, food, commute, var, total))
            # Compute totals
            if events:
                totals = [sum(col) for col in zip(*[(e[1], e[2], e[3], e[4], e[5], e[6], e[7]) for e in events])]
            else:
                totals = [0.0] * 7
            # Reuse labels
            required_rows = len(events) + 1  # +1 for totals
            current_rows = len(self.detail_labels)
            # Add more rows if needed
            while len(self.detail_labels) < required_rows:
                row_labels = []
                for c in range(8):
                    label = ctk.CTkLabel(self.detail_frame, text='', anchor='e' if c > 0 else 'w', font=self.normal_font)
                    row_labels.append(label)
                self.detail_labels.append(row_labels)
            # Hide extra rows
            for r in range(required_rows, current_rows):
                for label in self.detail_labels[r]:
                    label.grid_forget()
            # Update visible rows
            for r, event in enumerate(events):
                values = (
                    event[0],
                    f'${event[1]:,.2f}', f'${event[2]:,.2f}', f'${event[3]:,.2f}',
                    f'${event[4]:,.2f}', f'${event[5]:,.2f}', f'${event[6]:,.2f}', f'${event[7]:,.2f}'
                )
                for c, val in enumerate(values):
                    self.detail_labels[r][c].configure(text=val, font=self.normal_font)
                    self.detail_labels[r][c].grid(row=r+1, column=c, sticky='nsew', padx=5, pady=2)
            # Totals row
            values = (
                'Total',
                f'${totals[0]:,.2f}', f'${totals[1]:,.2f}', f'${totals[2]:,.2f}',
                f'${totals[3]:,.2f}', f'${totals[4]:,.2f}', f'${totals[5]:,.2f}', f'${totals[6]:,.2f}'
            )
            for c, val in enumerate(values):
                self.detail_labels[required_rows-1][c].configure(text=val, font=self.bold_font)
                self.detail_labels[required_rows-1][c].grid(row=required_rows, column=c, sticky='nsew', padx=5, pady=2)
            if invalid:
                messagebox.showwarning('Validation Warning', 'Some events have invalid values (e.g., negative) and were skipped.')
            other_total = totals[0] + totals[1] + totals[2] + totals[3]
            summary = (
                f'Travel time cost:    ${totals[4]:,.2f}\n'
                f'Travel expenses:     ${other_total:,.2f}\n'
                f'Seasonal variance:   ${totals[5]:,.2f}\n'
                + '─' * 40 + f"\nTotal budget all:    ${totals[6]:,.2f}"
            )
            self.output.configure(state='normal')
            self.output.delete('0.0', tk.END)
            self.output.insert('0.0', summary)
            self.output.configure(state='disabled')
            self.detail_frame.update_idletasks()  # Minimize redrawing
        except Exception as e:
            logging.error(f'Calculation error: {e}')
            messagebox.showerror('Calculation Error', f'Please check inputs.\n{e}')

    def _save(self) -> None:
        data = {'rates': {k: v.get() for k,v in self.rate_vars.items()}, 'events': []}
        for entries in self.entry_rows:
            vals = [e.get() for e in entries]
            if vals[0].strip():
                data['events'].append({k: vals[i] for i,k in enumerate(self.JSON_EVENT_KEYS)})
        fn = filedialog.asksaveasfilename(defaultextension='.json', filetypes=[('JSON', '*.json'), ('All', '*.*')])
        if fn:
            try:
                with open(fn, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2)
                messagebox.showinfo('Saved', f'Configuration saved to:\n{os.path.abspath(fn)}')
            except Exception as e:
                logging.error(f'Save error: {e}')
                messagebox.showerror('Save Error', f'Error saving file: {e}')

    def _load(self) -> None:
        fn = filedialog.askopenfilename(defaultextension='.json', filetypes=[('JSON', '*.json'), ('All', '*.*')])
        if not fn: return
        try:
            with open(fn, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except json.decoder.JSONDecodeError:
            messagebox.showerror('Load Error', 'Selected file is not a valid JSON file.')
            return
        except Exception as e:
            logging.error(f'Load error: {e}')
            messagebox.showerror('Load Error', f'Error loading file: {e}')
            return
        # Clear entire grid except header
        for widget in self.entry_frame.winfo_children():
            grid_info = widget.grid_info()
            if grid_info and grid_info.get('row', 0) > 0:
                widget.destroy()
        self.select_vars.clear()
        self.entry_rows.clear()
        # Populate events
        for ev in data.get('events', []):
            values = [str(ev.get(k, '')) for k in self.JSON_EVENT_KEYS]
            self._add_event_row(values)
        self.entry_frame.update_idletasks()  # Batch update after adding rows
        # Add blank row
        self._add_event_row()
        # Restore rates
        for k,var in self.rate_vars.items():
            if k in data.get('rates', {}):
                var.set(str(data['rates'][k]))
        messagebox.showinfo('Loaded', f'Configuration loaded from:\n{os.path.abspath(fn)}')
        self._debounce_calculate()

if __name__ == '__main__':
    BudgetCalculatorApp().mainloop()