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