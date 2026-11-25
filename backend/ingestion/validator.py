import pandas as pd

REQUIRED_NAV_COLUMNS = {"lat", "lon", "height"}


def validate_dataframes(dfs: dict[str, pd.DataFrame]) -> dict:
    """Return a validation report for a scenario's dataframes."""
    report = {"files": {}, "missing_required": []}
    for name, df in dfs.items():
        report["files"][name] = {
            "rows": len(df),
            "columns": list(df.columns),
            "dtypes": {column: str(dtype) for column, dtype in df.dtypes.items()},
            "missing_counts": df.isna().sum().to_dict(),
        }
    if "nav_pvt.csv" in dfs:
        missing = REQUIRED_NAV_COLUMNS - set(dfs["nav_pvt.csv"].columns)
        if missing:
            report["missing_required"] = sorted(missing)
    return report
