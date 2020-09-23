function dimensionTree(datasetInfo, dimDatasets, dims, start = null) {
    let thisLevel = Array.from(dims.values()).filter((dim) =>
        ((start === null) && !dim.hasOwnProperty('super')) ||
        ((start !== null) && dim.hasOwnProperty('super') && dim.super.value === start)
    );
    if (thisLevel.length > 0) {
        let html = start === null ? '<ul class="top">\n' : '<ul class="nested">';
        thisLevel.sort(function (a, b) {
            if (a.label.value > b.label.value) {
                return 1;
            } else if (a.label.value < b.label.value) {
                return -1;
            } else {
                return 0;
            }
        }).forEach((dim) => {
            const nested = dimensionTree(datasetInfo, dimDatasets, dims, dim.dim.value)
            const datasets = dimDatasets.has(dim.dim.value) ? dimDatasets.get(dim.dim.value) : new Set();
            const dimLink = dim.dim.value.startsWith('http://gss-data.org.uk/') ?
                `https://staging.gss-data.org.uk/resource?uri=${encodeURIComponent(dim.dim.value)}` : dim.dim.value;
            html = html + '<li>';
            if (nested.length > 0) {
                html = html + `<span class="caret"><a class="term" href="${dimLink}">${dim.label.value}</a></span>\n`;
            } else {
                html = html + `<a class="term" href="${dimLink}">${dim.label.value}</a>`;
            }
            if (datasets.size > 0) {
                const labels = Array.from(datasets).map((uri) => {
                    const ds = datasetInfo.get(uri);
                    if (ds.hasOwnProperty('abbr')) {
                        return ds.abbr.value + ' &mdash; ' + ds.label.value;
                    } else if (ds.hasOwnProperty('publisher')) {
                        return ds.publisher.value + ' &mdash; ' + ds.label.value;
                    } else {
                        return ds.label.value;
                    }
                });
                html = html + `<span data-toggle="tooltip" data-html="true" title="<ol><li>${labels.join('</li><li>')}</li></ol>" class="used">(${datasets.size})</span>`
            }
            if (dim.hasOwnProperty('comment')) {
                html = html + `<p>${dim.comment.value}\n`;
                if (dim.hasOwnProperty('def')) {
                    html = html + `<span class="text-right font-italic"><a href="${dim.def.value}">Source</a></span>`;
                }
                html = html + '</p>';
            }
            if (nested.length > 0) {
                html = html + nested;
            }
            html = html + '</li>\n';
        });
        html = html + "</ul>\n";
        return html;
    } else {
        return "";
    }
}

function sparql(query) {
    return fetch('https://staging.gss-data.org.uk/sparql', {
        method: 'POST',
        mode: 'cors',
        headers: {
            'Content-Type': 'application/sparql-query',
            'Accept': 'application/sparql-results+json'
        },
        body: query
    }).then((response) => response.json())
}

listDimensions = sparql(`PREFIX qb: <http://purl.org/linked-data/cube#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT *
WHERE {
  ?dim a qb:DimensionProperty ;
       rdfs:label ?label .
  OPTIONAL { ?dim rdfs:comment ?comment } .
  OPTIONAL { ?dim rdfs:subPropertyOf ?super } .
  OPTIONAL { ?dim rdfs:isDefinedBy ?def } .
}`).then((json) => {
    let dims = new Map();
    json.results.bindings.forEach((binding) => {
        dims.set(binding.dim.value, binding)
    });
    return dims;
});

datasetDimensions = sparql(`PREFIX qb: <http://purl.org/linked-data/cube#>
SELECT DISTINCT *
WHERE {
  ?dataset a qb:DataSet ;
             qb:structure / qb:component / qb:dimension ?dim .
}`).then((json) => {
    let dimDatasets = new Map();
    json.results.bindings.forEach((binding) => {
        let datasets = dimDatasets.has(binding.dim.value) ? dimDatasets.get(binding.dim.value) : new Set();
        datasets.add(binding.dataset.value);
        dimDatasets.set(binding.dim.value, datasets);
    });
    return dimDatasets;
});

listDatasets = sparql(`PREFIX qb: <http://purl.org/linked-data/cube#>
PREFIX pmdcat: <http://publishmydata.com/pmdcat#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT DISTINCT *
WHERE {
  ?dataset a qb:DataSet .
  ?cat pmdcat:datasetContents ?dataset ;
    rdfs:label ?label ;
  OPTIONAL { ?cat dct:publisher [ rdfs:label ?publisher ] } .
  OPTIONAL { ?cat dct:publisher [ skos:altLabel ?abbr ] } .
}`).then((json) => {
    let datasets = new Map();
    json.results.bindings.forEach((binding) => {
        datasets.set(binding.dataset.value, binding);
    });
    return datasets;
});

Promise
    .all([listDatasets, datasetDimensions, listDimensions])
    .then(function ([datasets, dimDatasets, dims]) {
        document.getElementById('dimensions').innerHTML = dimensionTree(datasets, dimDatasets, dims);
        $('.caret').click(function () {
            $(this).parent().find('.nested').toggleClass('active');
            $(this).toggleClass('caret-down');
        });
        $('[data-toggle="tooltip"]').tooltip();
    });