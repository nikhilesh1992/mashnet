const path = require("path");
const fs = require("fs");
const turf = require("@turf/turf");
const rimraf = require("rimraf");
const mkdirp = require("mkdirp");
const brain = require("brain.js");
const Chance = require("chance");
const Mashnet = require("../src/index.js");

const SHIFT = 0.003;
const JITTER = 0.0005;
const UNITS = { units: "kilometers" };
const TRAIN_COUNT = 10000;
const ITERATIONS = 10000;

const honolulu = require(path.join(__dirname, "../samples/here_atlas.json"));
const chance = new Chance();
const modelDir = path.join(__dirname, "../model/");
const model = path.join(modelDir, "match.json");
mkdirp.sync(modelDir);

var net = new Mashnet(honolulu);

var samples = [];
var i = 0;
for (let edge of net.edges) {
  // console.log(i);
  if (i < TRAIN_COUNT) {
    var fake = perturb(net, edge[1]);
    let fakeScores = net.scan(fake);

    if (!fakeScores || fakeScores.length === 0){
        continue;
    }

    i++;

    console.log("Sample Created: " + i);

    if (chance.bool()) {
      // drop
      var copy = JSON.parse(JSON.stringify(edge));
      net.edges.delete(edge[0]);
      net.edgetree.remove(treecopy(net, edge), (a, b) => {
        return a.id === b.id;
      });

      // match
      // const match = net.match(fakeScores);
      if (fakeScores[0].score){
        samples.push({
          input: {
            distance: fakeScores[0].distance,
            scale: fakeScores[0].scale,
            straight: fakeScores[0].straight,
            curve: fakeScores[0].curve,
            scan: fakeScores[0].scan,
            terminal: fakeScores[0].terminal,
            bearing: fakeScores[0].bearing,
            softmax: fakeScores[0].softmax
          },
          output: { match: 0 }
        });
      }


      // reinsert
      net.edges.set(copy[0], copy[1]);
      net.edgetree.insert(treecopy(net, edge));
    } else {
      // match
      // const match = net.match(fakeScores);
        if (fakeScores[0].score) {
      samples.push({
        input: {
          distance: fakeScores[0].distance,
          scale: fakeScores[0].scale,
          straight: fakeScores[0].straight,
          curve: fakeScores[0].curve,
          scan: fakeScores[0].scan,
          terminal: fakeScores[0].terminal,
          bearing: fakeScores[0].bearing,
          softmax: fakeScores[0].softmax
        },
        output: { match: 1 }
      });
    }
    }
  }
}

console.log(samples.length);

/*for(sample in samples){
    console.log(sample);
}*/

const nn = new brain.NeuralNetwork();
nn.train(samples, {
  log: true,
  logPeriod: 1000,
  iterations: ITERATIONS,
  learningRate: 0.1,
  errorThresh: 0.0005
});
fs.writeFileSync(model, JSON.stringify(nn.toJSON()));

console.log("done.");

function perturb(net, edge) {
  const shift = chance.normal() * SHIFT;
  const drift = Math.random() * 360;

  var coordinates = [];
  for (let ref of edge) {
    var vertex = net.vertices.get(ref);
    var point = turf.point(vertex);
    var shifted = turf.destination(point, shift, drift, UNITS);
    var jittered = turf.destination(
      shifted,
      chance.normal() * JITTER,
      Math.random() * 360,
      UNITS
    );
    coordinates.push(jittered.geometry.coordinates);
  }
  var line = turf.lineString(coordinates, { stroke: "#F46BFF" });
  return line;
}

function treecopy(net, edge) {
  var minX = Infinity;
  var minY = Infinity;
  var maxX = -Infinity;
  var maxY = -Infinity;
  for (let ref of edge[1]) {
    var vertex = net.vertices.get(ref);
    if (vertex[0] < minX) minX = vertex[0];
    if (vertex[1] < minY) minY = vertex[1];
    if (vertex[0] > maxX) maxX = vertex[0];
    if (vertex[1] > maxY) maxY = vertex[1];
  }
  return {
    minX: minX,
    minY: minY,
    maxX: maxX,
    maxY: maxY,
    id: edge[0]
  };
}
