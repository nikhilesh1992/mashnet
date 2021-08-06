const path = require("path");
const Mashnet = require("../src/index.js");
const turf = require('@turf/turf');
const readline = require('readline');
const fs = require('fs');

const amd_data = require(path.join(__dirname, "../samples/here_atlas.json"));

const net = new Mashnet(amd_data);

/*
const addition = {
  type: "Feature",
  properties: {},
    id: "399391107809557633",
  geometry: {
    type: "LineString",
    coordinates: [
        [7.28858,43.69436],[7.28857,43.69448],[7.28859,43.69464],[7.28858,43.69476]
    ]
  }
};
*/

let unprocessedRoads = [];
let newRoads = 0;
let existingRoads = 0;
let matches = 0;

try {
    // read contents of the file
    const data = fs.readFileSync('/home/nikhileb/workplace/mashnet/samples/private-edit-new.json', 'UTF-8');

    // split the contents by new line
    const lines = data.split(/\r?\n/);

    // print all lines
    lines.forEach((line) => {
      if (line) {
          try {
            const obj = JSON.parse(line);

            // scan
            const scores = net.scan(obj);

            // match
            const matchScore = net.match(scores);
            for(score in scores){
                //console.log("Source: " + obj.id + " Score: " + matchScore + " Target Entity: " + score);
            }
            if (matchScore >= 0.95) {
                console.log("Source: " + obj.id + " Score: " + matchScore + " Target Entity: " + scores[0].id);
                matches++;
            }

            /*
            if (scores.length === 0) {
                newRoads = newRoads + 1;

                // snap
                const snaps = net.snap(obj);

                // split
                const splits = net.split(snaps);

                // materialize
                const changesets = net.materialize(splits);
                //console.log(JSON.stringify(turf.featureCollection(changesets)));
                fs.writeFileSync("/home/nikhileb/workplace/mashnet/samples/private-edit-changesets-new.json", JSON.stringify(turf.featureCollection(changesets)) + "\n",
                    {
                        encoding: "utf8",
                        flag: "a+",
                        mode: 0o666
                    });
            } else {
                existingRoads = existingRoads + 1;
            }
            */
          } catch (err) {
            console.error(err);
            unprocessedRoads.push(line)
          }
          
      }
    });
} catch (err) {
    console.error(err);
}

console.log("Unprocessed Roads: " + unprocessedRoads.length)
console.log("New Roads: " + newRoads);
console.log("Existing Roads: " + existingRoads);
console.log("Matches: " + matches);
