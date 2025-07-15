# Travel Expense Calculator

The **Travel Expense Calculator** is an open-source desktop application written in Python, leveraging the [CustomTkinter](https://github.com/TomSchimansky/CustomTkinter) library for a modern, responsive GUI. It helps users estimate travel-related budgets across multiple events or trips by allowing customizable input of rates and event details.

---

## 📊 Overview

Users can configure the following rate parameters:

- **Average flight cost**  
- **Car rental (daily rate)**  
- **Hotel (nightly rate)**  
- **Hourly commute value**  
- **Food per diem**  
- **Seasonal variance (%)**

And specify event details:

- **Event name**  
- **Number of trips**  
- **Duration (days)**  
- **Number of people**  
- **Number of vehicles**  
- **Round-trip commute hours** (for inbound/outbound billing)

---

## ✨ Key Features

- **Dynamic Event Rows**  
  Add, delete, or duplicate event entries for flexible management.
- **Real-Time Validation & Auto-Calculation**  
  Instant feedback on inputs, with debouncing to maintain performance.
- **Tabbed Views**  
  - **Summary**: High-level totals by category  
  - **Details**: Itemized breakdowns (flights, cars, hotels, food, commute, variance)
- **Configuration Persistence**  
  Save and load your setups in JSON format for easy reuse.
- **Theme Switching & Clipboard Export**  
  Toggle between light/dark modes and copy summaries, details, or individual events to the clipboard.

---

## 🎯 Ideal For

- Delivery Executives scoping project travel budgets  
- Event planners coordinating group trips  
- Anyone planning multi-person travel & expense estimates

Designed for simplicity, the Travel Expense Calculator runs entirely locally—no internet connection required.
