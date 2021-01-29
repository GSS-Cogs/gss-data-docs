#!/usr/bin/env bash
docker run --name dockercsv2rdf --rm -v $PWD:/workspace -w /workspace -dt gsscogs/csv2rdf 
docker exec dockercsv2rdf \
  csv2rdf -m annotated \
          -t "out/life-expectancy.csv" \
          -u "out/life-expectancy.csv-metadata.json" \
          -o "out/life-expectancy.ttl"
docker stop dockercsv2rdf