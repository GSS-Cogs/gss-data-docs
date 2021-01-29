# A bare-bones example of the "Integrated Data Programme - Dissemination (IDP-D)" process.

## Introduction

TL;DR: Here's what we do:
1. Take a formatted output and make it _tidy_, in a `.csv` format.
2. Specify the `info.json` with relevant ontological info.
3. Run `CSVWMapping()` using the `.csv` and `info.json`, creating a `.csv-metadata.json` file known as _csvw_.
4. Run `csv2rdf` on the `.csv` and `.csv-metadata.json` to create a `.ttl` file which is an RDF representation of the data.

--------------------------------------------------------------------------------

This document and related code will aim to:
- Demonstrate the current IDP-D process in a minimal way, including
  - Using `databaker` to transform formatted, spreadsheet data into ["tidy"](https://r4ds.had.co.nz/tidy-data.html) data,
  - Transformation of a `.csv` into a `.csvw` using `gssutils`,
  - Transformation of the `.csvw` into an RDF (`.ttl`) representation using `csv2rdf`,
- Explicitly highlight the inputs and outputs of the process, and the relationship between these.

We follow the [example in the qb specification](https://www.w3.org/TR/vocab-data-cube/#example) but apply the IDP-D process to it. The example provides a subset of the [StatsWales statistical output which describes life expectancy broken down by region (unitary authority), sex and time](https://statswales.gov.wales/Catalogue/Health-and-Social-Care/Life-Expectancy/LifeExpectancy-by-LocalAuthority-Gender).

|                | 2004-2006 |        | 2005-2007 |        | 2006-2008 |        |
|----------------|-----------|--------|-----------|--------|-----------|--------|
|                | Male      | Female | Male      | Female | Male      | Female |
| Newport        | 76.70     | 80.70  | 77.10     | 80.90  | 77        | 81.50  |
| Cardiff        | 78.70     | 83.30  | 78.60     | 83.70  | 78.70     | 83.40  |
| Monmouthshire  | 76.60     | 81.30  | 76.50     | 81.50  | 76.60     | 81.70  |
| Merthyr Tydfil | 75.50     | 79.10  | 75.50     | 79.40  | 74.90     | 79.60  |

--------------------------------------------------------------------------------

We create an RDF representation of the observations which will look roughly as follows:

```turtle
@prefix qb: <http://purl.org/linked-data/cube#> .
@prefix eg: <http://example.org/ns#> .

eg:o11 a qb:Observation;
    qb:dataSet            eg:dataset-le3 ;
    eg:refArea            ex-geo:newport_00pr ;                  
    eg:lifeExpectancy     76.7 ;
    .
```

We won't provide in-depth discussion into the Resource Description Framework (RDF), CSV on the Web (CSVW) nor the Data Cube Vocabulary (`qb`), but provide pre-reading below.

- [RDF Primer](https://www.w3.org/TR/rdf11-primer/)
- [Data Cube Vocabulary](https://www.w3.org/TR/vocab-data-cube/)
- [CSVW Github](https://github.com/w3c/csvw)

## Project Structure

```
family-health/
├── datasets/
│   └── life-expectancy-in-wales/
│       ├── codelists/
│       ├── info.json
│       ├── main.py
│       └── spec.md
├── reference
└── tests
```

All statistical outputs are divided into _families_ such as health, trade or energy. Each family has an associated repository on github named `family-health` or `family-trade` etc.

Each statistical output belonging to the family has a directory within `family-x/datasets/`. The directory contains three files: 
- `info.json`, a configuration file containing some metadata and specification of ontologies, 
- `main.py`, a python script which performs the data transformation from formatted spreadsheet into tidy data and produces the resulting `csvw` (`.csv` and `-metadata.json`),
- `spec.md`, a markdown file written by Data Managers to specify (in English) how the data should be transformed, any ontological decisions made and the rationale for those decisions.

Data Managers and Data Engineers commit to the repository as the work progresses. Pushes to the _main_ branch [trigger a Jenkins pipeline](https://github.com/GSS-Cogs/pmd-jenkins-library/blob/family-pmd4/vars/familyTransformPipeline.groovy) which runs the `main.py` (to produce the `csvw`) and goes on to produce the RDF representation (`.ttl`) of the statistical data.

The Jenkins pipeline assumes the `csvw` will be written to a directory named `./out` and expects `main.py` to produce `.csv` and `-metadata.json` files.
```
.
└── out/
    ├── observations.csv
    ├── observations.csv-metadata.json  
    └── observations.ttl  
```

## Data Transformation

[`./main.py`](./main.py) which gives a worked example of using `databaker` to transform some data.

The first step is to transform the data into a _tidy_ format, (i.e., long instead of wide). A Data Manager investigates the data and produces a _Stage 1 Specification_ (contained in `spec.md`) which informs a Data Engineer of the steps to get the data into a _tidy_ format - e.g.,

| Value | Region  | Sex    | Period    |
|-------|---------|--------|-----------|
| 76.7  | Newport | Male   | 2004-2006 |
| 80.7  | Newport | Female | 2004-2006 |
| 77.1  | Newport | Male   | 2005-2007 |
| 80.9  | Newport | Female | 2005-2007 |
| 77.0  | Newport | Male   | 2006-2008 |
| 81.5  | Newport | Female | 2006-2008 |



--------------------------------------------------------------------------------

In complex situations, the Data Engineer will make a first pass at producing the _tidy_ data before returning to the Data Manager for further instruction. The Data Manager will produce a _Stage 2 Specification_ which should:
- Specify an appropriate set of URIs for each of the dataset's columns, 
- Specify these in the relevant `info.json` file, 
- Instruct of any additional transformations required of the data to enable the use of these URIs, for example, replacing labels with `skos:notation` type strings (e.g. Newport -> `W06000022`).

## Ontological Specification

For each column in the resulting dataset, the Data Manager will determine whether this column is a _dimension_, _measure_ or _attribute_, as defined in the [`qb` specification](https://www.w3.org/TR/vocab-data-cube/#dsd-dimensions). 

> A cube is organized according to a set of **dimensions**, **attributes** and **measures**. We collectively call these **components**.
> 
> The **dimension** components serve to identify the observations. A set of values for all the dimension components is sufficient to identify a single observation. Examples of dimensions include the time to which the observation applies, or a geographic region which the observation covers.
> 
> The **measure** components represent the phenomenon being observed.
> 
> The **attribute** components allow us to qualify and interpret the observed value(s). They enable specification of the units of measure, any scaling factors and metadata such as the status of the observation (e.g. estimated, provisional).

Data Managers also determine whether any additional data should be included - typical examples include _measurement units_ or _markers_ (symbols used in statistical publication to indicate suppression or other statistical treatment).

Once the Data Manager has identified on the components, they can begin to complete the `spec.md` and `info.json`.

```
// spec.md

# URI expansion as per here: https://tools.ietf.org/html/rfc6570#page-22

## Measures 
-----------------------------------------------------------------------

### Value:
- Represents Life Expectancy.
- We'll adopt the uri `<http://gss-data.org.uk/def/measure/life-expectancy>`

Resulting in triples of the form:
- `?observation <http://gss-data.org.uk/def/measure/life-expectancy> ?value`

## Dimensions 
---------------------------------------------------------------------

### Region:
- Represents Welsh Unitary Authority.
- We'll use the ONS statistical geography, e.g., `<http://statistics.data.gov.uk/id/statistical-geography/W06000022>`
- Will need to map Region name to the statistical code. "Newport" -> `"W06000022"`

Codes are as follows:

  | Region         |           |
  |----------------|-----------|
  | Newport        | W06000022 |
  | Cardiff        | W06000015 |
  | Monmouthshire  | W06000021 |
  | Merthyr Tydfil | W06000024 |

Resulting in triples of the form:

- `?observation sdmx-dimension:refArea <http://statistics.data.gov.uk/id/statistical-geography/{region}>`

---------------------------------------------------------------------

### Sex:
- We'll use the `sdmx-dimension:sex` dimension which takes values of the form e.g., `<http://purl.org/linked-data/sdmx/2009/code#sex-M>`
- Will need to map to M/F/T(otal). "Male" -> M.

Resulting in triples of the form:
- `?observation sdmx-dimension:sex <http://purl.org/linked-data/sdmx/2009/code#sex-{sex}>`

---------------------------------------------------------------------

### Period:
- We'll use the `sdmx-dimension:refPeriod` dimension with values from the `<https://reference.data.gov.uk/>` time intervals ontology. 
- Since the period represents an arbitrary 3 Year interval from 1st Jan we use the gregorian interval API.
- Will need to map Period to the first YYYY. "2012-2014" -> 2012.
- Resulting in triples of the form:
  `?observation sdmx-dimension:refPeriod <http://reference.data.gov.uk/id/gregorian-interval/{period}-01-01T00:00:00/P3Y>`

## Attributes 
---------------------------------------------------------------------

### Units :
- Not included in the csv but should be specified.
- We'll adopt the uri `<http://gss-data.org.uk/def/concept/measurement-units/years>`

## Result 
---------------------------------------------------------------------

You should end up with something looking like this:

| Value | Region    | Sex    | Period |
|-------|-----------|--------|--------|
| 76.7  | W06000022 | Male   | 2004   |
| 80.7  | W06000022 | Female | 2004   |
| 77.1  | W06000022 | Male   | 2005   |
| 80.9  | W06000022 | Female | 2005   |
| 77.0  | W06000022 | Male   | 2006   |
| 81.5  | W06000022 | Female | 2006   |
```

In this example, the spec requests the Data Engineers to make two key changes:
- Replace the region with the relevant code found in the statistical geography linked data (and the DM went the extra mile by laying these out in the spec!)
- Replace the period of the form YYYY-ZZZZ with just YYYY.


--------------------------------------------------------------------------------

### How to make ontological decisions...

From here, the Data Manager will look to complete the `info.json`.

1. Where possible, we use resources defined elsewhere from well known ontologies. The Data Managers keep a [list of ontological preferences](https://collaborate2.ons.gov.uk/confluence/display/PHEM/Ontological+Preferences). Some common ones:

| Prefix           | Namespace                                                  | Reference (.ttl where possible)                                              |
|------------------|------------------------------------------------------------|------------------------------------------------------------------------------|
| `sdmx-attribute` | `http://purl.org/linked-data/sdmx/2009/attribute#`         | `http://purl.org/linked-data/sdmx/2009/attribute#`                           |
| `sdmx-concept`   | `http://purl.org/linked-data/sdmx/2009/concept#`           | `http://purl.org/linked-data/sdmx/2009/concept#`                             |
| `sdmx-code`      | `http://purl.org/linked-data/sdmx/2009/code#`              | `http://purl.org/linked-data/sdmx/2009/code#`                                |
| `sdmx-dimension` | `http://purl.org/linked-data/sdmx/2009/dimension#`         | `http://purl.org/linked-data/sdmx/2009/dimension#`                           |
| `sdmx-measure`   | `http://purl.org/linked-data/sdmx/2009/measure#`           | `http://purl.org/linked-data/sdmx/2009/measure#`                             |
| `stat-geog`      | `http://statistics.data.gov.uk/def/statistical-geography#` | `http://statistics.data.gov.uk/def/statistical-geography#`                   |
| `time-interval`  | `http://reference.data.gov.uk/id/`                         | `https://github.com/epimorphics/IntervalServer/blob/master/interval-uris.md` |

2. If we need to define a component ourselves, dividing statistical outputs into families means can define components at three levels - _globally_, _within-family_ and _locally_.
    
    - **Global** components are those which are commonly found across the universe of statistical outputs - _count_, _percent_, _weight_ etc.
    - **Within-family** components are those found commonly _within the area_. GDP (Trade), Medical terms (Health) etc.
    - **Local** components are associated very specifically with the dataset - say if statistical producers derive their own bespoke geographies.

With these things in mind, we can build up our `info.json`. The `info.json` is combined with the `.csv` file to produce a `csvw`. The `csvw` is built using the `gssutils.csvw` module. The `gssutils.csvw.CSVWMapping()` class consumes the `info.json` and outputs a `csvw`, which can be seen [here](https://github.com/GSS-Cogs/gss-utils/blob/627fe24daa1b2559de5467ff55d8ce022523209d/gssutils/csvw/mapping.py#L165).

The code can take a bit of analysing to make sense of it, so an explanation has been written [here](https://collaborate2.ons.gov.uk/confluence/display/PHEM/info.json+Column+Configuration).

--------------------------------------------------------------------------------

Let's start -

- Value is a **measure** of _life expectancy_. Life expectancy is measured in _years_.

The `CSVWMapping()` allows expression of measures and their units by specifying `measure` and `unit` keys in the `info.json`. 

For measures, [convention so far](https://staging.gss-data.org.uk/tools/sparql?query=PREFIX%20owl%3A%20%3Chttp%3A%2F%2Fwww.w3.org%2F2002%2F07%2Fowl%23%3E%0APREFIX%20void%3A%20%3Chttp%3A%2F%2Frdfs.org%2Fns%2Fvoid%23%3E%0APREFIX%20pmdkos%3A%20%3Chttp%3A%2F%2Fpublishmydata.com%2Fdef%2Fpmdkos%2F%3E%0APREFIX%20dcterms%3A%20%3Chttp%3A%2F%2Fpurl.org%2Fdc%2Fterms%2F%3E%0APREFIX%20rdf%3A%20%3Chttp%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23%3E%0APREFIX%20dcat%3A%20%3Chttp%3A%2F%2Fwww.w3.org%2Fns%2Fdcat%23%3E%0APREFIX%20pmdui%3A%20%3Chttp%3A%2F%2Fpublishmydata.com%2Fdef%2Fpmdui%2F%3E%0APREFIX%20rdfs%3A%20%3Chttp%3A%2F%2Fwww.w3.org%2F2000%2F01%2Frdf-schema%23%3E%0APREFIX%20markdown%3A%20%3Chttps%3A%2F%2Fwww.w3.org%2Fns%2Fiana%2Fmedia-types%2Ftext%2Fmarkdown%23%3E%0APREFIX%20qb%3A%20%3Chttp%3A%2F%2Fpurl.org%2Flinked-data%2Fcube%23%3E%0APREFIX%20skos%3A%20%3Chttp%3A%2F%2Fwww.w3.org%2F2004%2F02%2Fskos%2Fcore%23%3E%0APREFIX%20xsd%3A%20%3Chttp%3A%2F%2Fwww.w3.org%2F2001%2FXMLSchema%23%3E%0A%0ASELECT%20DISTINCT%20%3Fo%0AWHERE%20%7B%20%3Fs%20qb%3Ameasure%20%3Fo%20%7D) defines a measure with a URI of the form `<http://gss-data.org.uk/def/measure/{measure-name}>`.

For units, `<http://gss-data.org.uk/def/concept/measurement-units/{measure-name}>` is convention.

Note that the above are referred to as _global_ level components. It is also possible to specify _family_ level components by including the `family-name` before `/measure/` or `/concept/`.

```json
// info.json
{
   "transform": {
        "columns": {
            "Value": {
                "measure": "http://gss-data.org.uk/def/measure/life-expectancy",
                "unit": "http://gss-data.org.uk/def/concept/measurement-units/years"
            },
            ...
 }
```

```json
// life-expectancy.csv-metadata.json
{      
      ...
      "tableSchema": {
        "columns": [
          {
            "name": "value",
            "titles": "Value",
            "datatype": "number",
            "propertyUrl": "http://gss-data.org.uk/def/measure/life-expectancy"
          },
          ...
          {
            "name": "virt_unit",
            "virtual": true,
            "propertyUrl": "http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure",
            "valueUrl": "http://gss-data.org.uk/def/concept/measurement-units/years"
          },
          ...
}
```

Resulting in the following RDF:

```ttl
// life-expectancy.ttl
<http://gss-data.org.uk/data/gss_data/health/life-expectancy-in-wales#structure> 
  a <http://purl.org/linked-data/cube#DataStructureDefinition>;
  <http://purl.org/linked-data/cube#component> <http://gss-data.org.uk/data/gss_data/health/life-expectancy-in-wales#component/unit>,
    <http://gss-data.org.uk/data/gss_data/health/life-expectancy-in-wales#component/value> .

<http://gss-data.org.uk/data/gss_data/health/life-expectancy-in-wales#component/value>
  a <http://purl.org/linked-data/cube#ComponentSpecification>;
  <http://purl.org/linked-data/cube#componentProperty> <http://gss-data.org.uk/def/measure/life-expectancy>;
  <http://purl.org/linked-data/cube#measure> <http://gss-data.org.uk/def/measure/life-expectancy> .

<http://gss-data.org.uk/def/measure/life-expectancy> a <http://purl.org/linked-data/cube#MeasureProperty> .

<http://gss-data.org.uk/data/gss_data/health/life-expectancy-in-wales#component/unit>
  a <http://purl.org/linked-data/cube#ComponentSpecification>;
  <http://purl.org/linked-data/cube#attribute> <http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure>;
  <http://purl.org/linked-data/cube#componentProperty> <http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure> .

<http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure> a <http://purl.org/linked-data/cube#AttributeProperty> .

<http://gss-data.org.uk/data/gss_data/health/life-expectancy-in-wales/W06000022/M/2004>
  a <http://purl.org/linked-data/cube#Observation>;
  <http://gss-data.org.uk/def/measure/life-expectancy> 7.67E1;
  <http://purl.org/linked-data/cube#measureType> <http://gss-data.org.uk/def/measure/life-expectancy>;
  <http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure> <http://gss-data.org.uk/def/concept/measurement-units/years>;
```

Note that if creating new measures or measurement units, that these need to be added to the relevant `csv` file in the reference data location ([here](https://github.com/GSS-Cogs/ref_common/blob/pmd4/measures.csv) or [here](https://github.com/GSS-Cogs/ref_common/blob/pmd4/codelists/measurement-units.csv)).

--------------------------------------------------------------------------------

Next we'll move onto the dimensions. 

- Next we have _region_. The statistical output is referring to Welsh Unitary Authorities. `statistics.data.gov.uk` has definitions for all sorts of UK geographies.

It can be helpful to imagine the triples you want to generate, which will typically be of the form `<observation> <dimension> <value>`.

Then ask some questions:

1. Do you want to define a local dimension, or is there an external dimension defined somewhere which can be adopted?
2. Do you want to define a codelist, or is there an external codelist defined which can be adopted?
3. What form should the dimension's value take?

- If you want to specify the dimension exactly (e.g., if you want to adopt an external dimension) then use the `dimension` key.
- If you want to specify a local dimension and a parent, use the `parent` key.
- If you don't want to generate a codelist (as you want to adopt an external codelist) then set `"codelist": false`. If you want to set a specific codelist, then set a URI - else, it will default to a locally defined codelist.

See this as an example:

```json
// info.json
{
            ...
            "Region": {
                "parent": "http://purl.org/linked-data/sdmx/2009/dimension#refArea",
                "value": "http://statistics.data.gov.uk/id/statistical-geography/{region}",
                "codelist": false
            },
            ...
}
```

The curly brackets "{}" in the `"value"` URI above is a [URI Template](https://tools.ietf.org/html/rfc6570#page-22) which can be used to dynamically change the URI based on the value contained in the `.csv`.

This notation defines a local dimension, and defines a `rdfs:subPropertyOf` relationship to whatever is specified as the `parent`.

This generates the following RDF:

```ttl
# Define the component
<http://gss-data.org.uk/data/gss_data/health/life-expectancy-in-wales#component/region>
  a <http://purl.org/linked-data/cube#ComponentSpecification>;
  <http://purl.org/linked-data/cube#componentProperty> <http://gss-data.org.uk/data/gss_data/health/life-expectancy-in-wales#dimension/region>;
  <http://purl.org/linked-data/cube#dimension> <http://gss-data.org.uk/data/gss_data/health/life-expectancy-in-wales#dimension/region> .

# Define the local dimension
<http://gss-data.org.uk/data/gss_data/health/life-expectancy-in-wales#dimension/region>
  a <http://purl.org/linked-data/cube#DimensionProperty>;
  <http://www.w3.org/2000/01/rdf-schema#label> "Region"@en;
  <http://www.w3.org/2000/01/rdf-schema#range> <http://gss-data.org.uk/data/gss_data/health/life-expectancy-in-wales#class/Region>;
  <http://www.w3.org/2000/01/rdf-schema#subPropertyOf> <http://purl.org/linked-data/sdmx/2009/dimension#refArea> .

# Usage with an observation
<http://gss-data.org.uk/data/gss_data/health/life-expectancy-in-wales/W06000022/M/2004>
  a <http://purl.org/linked-data/cube#Observation>;
  <http://gss-data.org.uk/data/gss_data/health/life-expectancy-in-wales#dimension/region>
    <http://statistics.data.gov.uk/id/statistical-geography/W06000022>;
```

Omitting `"codelist" : false` would result in an additional triple, specifying a locally defined codelist:

```ttl
# Specifying a local codelist
<http://gss-data.org.uk/data/gss_data/health/life-expectancy-in-wales#dimension/region>
  <http://purl.org/linked-data/cube#codeList> <http://gss-data.org.uk/data/gss_data/health/life-expectancy-in-wales#scheme/region>;
```

The Data Manager would then need to prepare a codelist for consumption by the platform. Many examples can be found [here](https://github.com/GSS-Cogs/ref_common/tree/pmd4/codelists). The requirement from the Data Manager is production of a `.csv` including the codes and a `-metadata.json` file associated with that `.csv` which translates into an appropriate RDF representation.

Upon committing a codelist, a [Jenkins Reference Data Pipeline](https://github.com/GSS-Cogs/pmd-jenkins-library/blob/family-pmd4/vars/familyReferencePipeline.groovy) runs and produces an RDF representation.

Given a codelist `.csv` looking something like this:

| Label          | Notation  | Sort Priority |
|----------------|-----------|---------------|
| Newport        | W06000022 | 1             |
| Cardiff        | W06000015 | 2             |
| Monmouthshire  | W06000021 | 3             |
| Merthyr Tydfil | W06000024 | 4             |

An RDF representation would look as follows:

```ttl
# Defining a local codelist
<http://gss-data.org.uk/data/gss_data/health/life-expectancy-in-wales#scheme/region>
  a <http://publishmydata.com/pmdcat#ConceptScheme>, <http://www.w3.org/2004/02/skos/core#ConceptScheme>;

<http://gss-data.org.uk/data/gss_data/life-expectancy-in-wales#scheme/region/W06000022>
  a <http://www.w3.org/2004/02/skos/core#Concept>;
  <http://www.w3.org/2000/01/rdf-schema#label> "Newport";
  <http://www.w3.org/2004/02/skos/core#inScheme> <http://gss-data.org.uk/data/gss_data/health/life-expectancy-in-wales#scheme/region>;
  <http://www.w3.org/2004/02/skos/core#notation> "W06000022";
  <http://www.w3.org/ns/ui#sortPriority> 1 .
```

Alternatively, specifying `"codelist": "xxx"` would result in a triple of the form:

```ttl
# Specifying an external codelist
<http://gss-data.org.uk/data/gss_data/health/life-expectancy-in-wales#dimension/region>
  <http://purl.org/linked-data/cube#codeList> <xxx>;
```

This references an external codelist defined elsewhere.

Finally, specifying `"dimension": "http://purl.org/linked-data/sdmx/2009/dimension#refArea"` as opposed to `"parent":` would result in the following:

```ttl
# Adopting an external dimension
<http://gss-data.org.uk/data/gss_data/health/life-expectancy-in-wales#component/region>
  a <http://purl.org/linked-data/cube#ComponentSpecification>;
  <http://purl.org/linked-data/cube#componentProperty> <http://purl.org/linked-data/sdmx/2009/dimension#refArea>;
  <http://purl.org/linked-data/cube#dimension> <http://purl.org/linked-data/sdmx/2009/dimension#refArea> .

<http://purl.org/linked-data/sdmx/2009/dimension#refArea> a <http://purl.org/linked-data/cube#DimensionProperty>;
  <http://www.w3.org/2000/01/rdf-schema#range> <http://gss-data.org.uk/data/gss_data/health/life-expectancy-in-wales#class/Region> .
```

We'll stop here - but attributes are handled in a similar way where the `"attribute"` key can specify a specific attribute URI, and the `"value"` key specifies what value the attribute should take.

--------------------------------------------------------------------------------

## Some quick code stuff:

### To get a `-metadata.json` file:

```python
import json
from gssutils.csvw.mapping import CSVWMapping
from urllib.parse import urljoin

csv_name = "life-expectancy.csv"
info = json.load(open("info.json"))
out = Path("out")
out.mkdir(exist_ok=True)
mapping = CSVWMapping()
mapping.set_csv(out / csv_name)
mapping.set_mapping(info)
mapping.set_dataset_uri(urljoin("http://gss-data.org.uk", "data/gss_data/health/life-expectancy-in-wales"))
mapping.write(out / f"{csv_name}-metadata.json")
```


### To turn the `csvw` into `RDF`:

```bash
csvname="life-expectancy"
docker run -v $PWD:/workspace -w /workspace -dit gsscogs/csv2rdf \
csv2rdf -t out/$csvname.csv -u out/$csvname.csv-metadata.json -m annotated -o out/$csvname.ttl
```