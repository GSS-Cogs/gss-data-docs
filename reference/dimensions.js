function dimensionTree(dimDatasets, dims, start=null) {
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
            const nested = dimensionTree(dimDatasets, dims, dim.dim.value)
            const datasets = dimDatasets.has(dim.dim.value) ? dimDatasets.get(dim.dim.value) : new Set();
            html = html + '<li>';
            if (nested.length > 0) {
                html = html + `<span class="caret"><a class="term" href="${dim.dim.value}">${dim.label.value}</a></span>\n`;
            } else {
                html = html + `<a class="term" href="${dim.dim.value}">${dim.label.value}</a>`;
            }
            if (datasets.size > 0) {
                html = html + `<span title="${Array.from(datasets).join(' ')}" class="used">(${datasets.size})</span>`
            }
            if (dim.hasOwnProperty('comment')) {
                html = html + `<p>${dim.comment.value}</p>\n`;
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

function listDimensions(dimDatasets) {
    fetch('https://staging.gss-data.org.uk/sparql', {
        method: 'POST',
        mode: 'cors',
        headers: {
            'Content-Type': 'application/sparql-query',
            'Accept': 'application/sparql-results+json'
        },
        body: `PREFIX qb: <http://purl.org/linked-data/cube#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT *
WHERE {
  ?dim a qb:DimensionProperty ;
       rdfs:label ?label .
  OPTIONAL { ?dim rdfs:comment ?comment } .
  OPTIONAL { ?dim rdfs:subPropertyOf ?super } .
  OPTIONAL { ?dim rdfs:isDefinedBy ?doc } .
}`})
        .then((response) => response.json())
        .then((json) => {
            let dims = new Map();
            json.results.bindings.forEach((binding) => {
                dims.set(binding.dim.value, binding)
            });
            document.getElementById('dimensions').innerHTML = dimensionTree(dimDatasets, dims);
            $('.caret').click(function() {
                $(this).parent().find('.nested').toggleClass('active');
                $(this).toggleClass('caret-down');
            });
        });
}

function datasetDimensions() {
    fetch('https://staging.gss-data.org.uk/sparql', {
        method: 'POST',
        mode: 'cors',
        headers: {
            'Content-Type': 'application/sparql-query',
            'Accept': 'application/sparql-results+json'
        },
        body: `PREFIX qb: <http://purl.org/linked-data/cube#>

SELECT DISTINCT *
WHERE {
  ?dataset a qb:DataSet ;
             qb:structure / qb:component / qb:dimension ?dim .
}`
    })
        .then((response) => response.json())
        .then((json) => {
            let dimDatasets = new Map();
            json.results.bindings.forEach((binding) => {
                let datasets = dimDatasets.has(binding.dim.value) ? dimDatasets.get(binding.dim.value) : new Set();
                datasets.add(binding.dataset.value);
                dimDatasets.set(binding.dim.value, datasets);
            });
            listDimensions(dimDatasets);
        });
}

datasetDimensions();