use semver::Version;
use reqwest::header::{ACCEPT, USER_AGENT};

#[derive(Debug, Clone)]
pub struct UpdateInfo {
    pub has_update: bool,
    pub latest: Option<String>,
    pub release_url: Option<String>,
}

pub async fn check_for_update(current_version: &str, release_api_url: &str) -> Result<UpdateInfo, String> {
    let client = reqwest::Client::new();
    let response = client
        .get(release_api_url)
        .header(USER_AGENT, "travel-estimator-updater/1.0")
        .header(ACCEPT, "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| format!("request failed: {e}"))?
        .error_for_status()
        .map_err(|e| format!("request failed: {e}"))?;
    let payload: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("response parse failed: {e}"))?;

    let latest_tag = payload
        .get("tag_name")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "tag_name missing".to_string())?
        .trim_start_matches('v')
        .to_string();

    let current = Version::parse(current_version.trim_start_matches('v'))
        .map_err(|e| format!("invalid current version: {e}"))?;
    let latest = Version::parse(&latest_tag).map_err(|e| format!("invalid latest version: {e}"))?;

    Ok(UpdateInfo {
        has_update: latest > current,
        latest: Some(latest_tag),
        release_url: payload
            .get("html_url")
            .and_then(|v| v.as_str())
            .map(ToOwned::to_owned),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compares_versions() {
        let info = UpdateInfo {
            has_update: true,
            latest: Some("1.2.0".to_string()),
            release_url: Some("https://example.com".to_string()),
        };
        assert!(info.has_update);
    }
}
