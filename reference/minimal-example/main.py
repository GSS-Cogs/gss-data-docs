# STAGE 1 --------------------------------------------------------------------------------------------------------------

# Let's get started with databaker
# The tutorial here is a useful reference:
# https://github.com/GSS-Cogs/databaker/tree/master/databaker/tutorial
# And a jupyterlab has been prepared here:
# https://github.com/GSS-Cogs/databaker-walkthrough

if __name__ == "__main__":
    import pandas as pd
    from databaker.framework import loadxlstabs, HDim, ConversionSegment, DOWN, UP, LEFT, RIGHT, DIRECTLY, CLOSEST
    from pathlib import Path
    import json
    from gssutils.csvw.mapping import CSVWMapping
    from urllib.parse import urljoin

    tabs = loadxlstabs(inputfile="life-expectancy.xlsx",
                       sheetids=["Sheet 1"],
                       verbose=False)

    # tabs returns a list object, where each element is a tab or sheet of a spreadsheet.
    data = tabs[0]

    # Select the relevant data items.
    observations = data.excel_ref("B3").expand(DOWN).expand(RIGHT).is_not_blank()
    region = data.excel_ref("A3").expand(DOWN).is_not_blank()
    sex = data.excel_ref("B2").expand(RIGHT).is_not_blank()
    period = data.excel_ref("B1").expand(RIGHT).is_not_blank()

    # Assign dimensions
    dimensions = [
        # The authority appears in the spreadsheet directly to the left of the observation.
        # "Each authority is directly left of each observation."
        HDim(region, "Region", DIRECTLY, LEFT),
        # The sex appears in the spreadsheet directly above the observation.
        # "Each sex is directly above each observation."
        HDim(sex, "Sex", DIRECTLY, UP),
        # The period appears in the spreadsheet above the observation. The spreadsheet makes use of merged cells for
        # period, which should be treated as populating only the upper-leftmost merged cell.
        # For each observation, we want to navigate to the row containing the period, and select the left-nearest entry
        # relative to the observation.
        # "Each period is the closest leftmost period to each observation."
        HDim(period, "Period", CLOSEST, LEFT)
    ]

    df = (
        ConversionSegment(data, dimensions, observations)
        .topandas()
        # When you upload to PMD it might expect a field called "Value"
        # Ask Mike?
        .rename(columns={"OBS" : "Value"})
    )

    out = Path("out")
    out.mkdir(exist_ok=True)
    df.to_csv(out / "life-expectancy-raw.csv", index=False)

    #>         Value        Region          Sex     Period
    #>     0   76.7         Newport         Male    2004-2006
    #>     1   80.7         Newport         Female  2004-2006
    #>     2   77.1         Newport         Male    2005-2007
    #>     3   80.9         Newport         Female  2005-2007
    #>     4   77.0         Newport         Male    2006-2008
    #>     5   81.5         Newport         Female  2006-2008
    #>     6   78.7         Cardiff         Male    2004-2006
    #>     7   83.3         Cardiff         Female  2004-2006
    #>     8   78.6         Cardiff         Male    2005-2007
    #>     9   83.7         Cardiff         Female  2005-2007
    #>     10  78.7         Cardiff         Male    2006-2008
    #>     11  83.4         Cardiff         Female  2006-2008
    #>     12  76.6         Monmouthshire   Male    2004-2006
    #>     13  81.3         Monmouthshire   Female  2004-2006
    #>     14  76.5         Monmouthshire   Male    2005-2007
    #>     15  81.5         Monmouthshire   Female  2005-2007
    #>     16  76.6         Monmouthshire   Male    2006-2008
    #>     17  81.7         Monmouthshire   Female  2006-2008
    #>     18  75.5         Merthyr Tydfil  Male    2004-2006
    #>     19  79.1         Merthyr Tydfil  Female  2004-2006
    #>     20  75.5         Merthyr Tydfil  Male    2005-2007
    #>     21  79.4         Merthyr Tydfil  Female  2005-2007
    #>     22  74.9         Merthyr Tydfil  Male    2006-2008
    #>     23  79.6         Merthyr Tydfil  Female  2006-2008

# STAGE 2 --------------------------------------------------------------------------------------------------------------

unitary_authorities = {
    "Cardiff":        "W06000015",
    "Merthyr Tydfil": "W06000024",
    "Monmouthshire":  "W06000021",
    "Newport":        "W06000022"
}

df["Region"] = df.apply(lambda row: unitary_authorities[row["Region"]], axis=1)
df["Sex"]    = df.apply(lambda row: row["Sex"][0], axis=1)
df["Period"] = df.apply(lambda row: row["Period"][0:4], axis=1)

# Jenkins specifically requires that the .csv be written to a directory named /out/

csv_name = "life-expectancy.csv"
df.to_csv(out / csv_name, index=False)
info = json.load(open("info.json"))

# Once the .csv is written we can combine with info.json to derive the -metadata.json file.

mapping = CSVWMapping()
mapping.set_csv(out / csv_name) # Specifies the csv subject of the csvw
mapping.set_mapping(info)       # Provides the info.json object
mapping.set_dataset_uri(urljoin("http://gss-data.org.uk", "data/gss_data/health/life-expectancy-in-wales"))
mapping.write(out / f"{csv_name}-metadata.json")