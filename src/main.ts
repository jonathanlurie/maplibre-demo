// The Map class in Maplibre is just called "Map", which is
// a bit unfortunate because "Map" is already the name of
// a class in the JS standard library. To avoid confusion
// we import the Maplibre Map class under the name MLMap
import {Map as MLMap} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";


const terrainSourceId = "maptiler-terrain-source";

// To add the terrain. It also add a source
// for the terrian data.
// It can also be used to adjust the exaggeration.
function enableTerrain(map: MLMap, exaggeration = 1) {
  const curentTerrainSettings = map.getTerrain();
  const terrainSource = map.getSource(terrainSourceId);

  // The data source for the terrain is not set, so we add it
  if (!terrainSource) {
    map.addSource(terrainSourceId, {
      type: "raster-dem",
      url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${import.meta.env.VITE_MAPTILER_API_KEY}`,
    });
  }

  // The terrain settings are not set (no terrain)
  if (!curentTerrainSettings) {
    map.setTerrain({
      source: terrainSourceId,
      exaggeration,
    });
  } else {
    // we only want to update the exaggeration of the terrain
    map.terrain.exaggeration = exaggeration;
    // If it's just about updating the exaggeration, we have to
    // force a render, or else it's only going to render when interacting with
    // the map (pan, zoom, adding an element, etc.)
    map.triggerRepaint();
  }
}



// To remove the terrain. It also removes the terrain data source
// to prevent unnecessary terrai tile downloads.
// Note: some MapTiler styles (such as outdoor-v2) contain
// a hillshading layer, also fed by the terrain tiles.
// removing a custom source for the terrain bump will not remove the
// hillshading terrain source. As a result, these hillshaded style
// will continue to work well and terrain tiles will continue to
// be fetched.
function disableTerrain(map: MLMap) {
  map.setTerrain(null);
  map.removeSource(terrainSourceId);
}


// Create a sky + fog that's typical of a daylight in summer (kinda)
// Most of the time, the color of the horizon is going to be the same as
// the color of the fog (white), at least for daylight.
function setDaylightVibe(map: MLMap) {
  map.setSky({
    // color of the sky. Bright blue here.
    "sky-color": '#037ffc',
    
    // in [0, 1], with:
    // 0 all the sky is of "sky-color", with no gradient
    // 1 very long gradient above the horizon line 
    //        between "horizon-color" (close to horizon) and "sky-color" high up in the sky
    "sky-horizon-blend": 0.5,
    
    // Color of the horizon. Depending on the blending factors, this color will
    // difuse to the fog (towards camera) and/or to the sky (high up, only visible with low point of view)
    "horizon-color": "#ffffff",

    // in [0, 1], with:
    // 0 "horizon-color" diffuses a lot towards the camera to fog/ground,
    //   especially if "fog-ground-blend" is close to 1.
    // 1 the "horizon-color" does not diffuse at all to the fog/ground
    "horizon-fog-blend": 0.8,

    // Color of the fog. The fog goes from the horizon line towards the camera
    "fog-color": "#ffffff",

    // in [0, 1], with 
    // 0 covering a long distance from the horizon line towards the camera
    // 1 basically no fog (not going any further than horizon line).
    // If close to 1, the "fog-color" will hardly be present and instead 
    // "horizon-color" will take precedence
    "fog-ground-blend": 0.9,

    // On daylight mode, we remove the atmosphere entirely
    "atmosphere-blend": 0
  });

}


// Set the sky + fog to a night style
function setNighVibe(map: MLMap) {
  map.setSky({
    "sky-color": '#00092b',
    "sky-horizon-blend": 0.4,
    "horizon-color": "#001d91",
    "horizon-fog-blend": 0.999,
    "fog-color": "#00092b",
    "fog-ground-blend": 0.,

    // The atmosphere blend can be a number in [0, 1]
    // where 0 hides the atm entirely and 1 makes it very visible.
    // A nice thing to do is to make it an expression that depends on
    // the zoom level, so that the atm fades out and doesn't get too much in the 
    // way as we zoom in. Just like below:
    "atmosphere-blend": [
      "interpolate", // means we interpolate...
      ["linear"], // .. linearly ...
      ["zoom"], // ... based on the zoom level. And then its a values 2 by 2:

      0,   // at zoom level 0 (from afar)...
      0.6, // the atm blending value is 0.6

      3,   // as we zoom up to z3...
      0.3, // the atm blending value shrinks to 3, so it's fading

      4.5, // and finaly, when zooming up to z4.5 (and closer)...
      0    // the atm becomes totally invisible

      // note that we could have more steps here, but for this demo, 3 is enough.
    ]
  });

  // The light is related to shadow of extruded buildings
  // (not realy the topic here as we use the Outdoor style which does not feature any extruded building)
  // but it also matters for the above "atmosphere-blend".
  map.setLight({
    anchor: "map", // This means the light acts more like the sun.
                   // The alternative ("viewport") means the light source is rather
                   // attached to the camera, so as you move around, the light sticks

    position: [ // The position option is quite hard to get actually, and would probably deserve its own demo
                // in the meantime, mode info here https://maplibre.org/maplibre-style-spec/light/
      1,  // radial coord
      90, // azimutal angle
      80  // polar angle
    ],
  });
}


// Activate the globe projection
function enableGlobe(map: MLMap) {
  map.setProjection({
    type: "globe",
  });
}

// Activate the Mercator projection
function enableMercator(map: MLMap) {
  map.setProjection({
    type: "mercator",
  });
}


function toggleGlobe(map: MLMap) {
  const proj = map.getProjection();

  // If the projection is not speicified, it means Mercator (default un Maplibre)
  if (!proj || proj.type === "mercator") {
    enableGlobe(map);
  } else {
    enableMercator(map);
  }
}


function toggleTerrain(map: MLMap) {
  map.getTerrain() ? disableTerrain(map) : enableTerrain(map);
}


function toggleDaylight(map: MLMap, isDaylight: boolean) {
  const proj = map.getProjection();
  const reaplyProjectionSettings = !proj || proj.type === "mercator" ? enableMercator : enableGlobe;
  const reaplyTerrainSettings = map.getTerrain() ? enableTerrain : () => {};

  if (isDaylight) {
    map.setStyle(`https://api.maptiler.com/maps/outdoor-v2-dark/style.json?key=${import.meta.env.VITE_MAPTILER_API_KEY}`);
    map.once("styledata", () => {
      setNighVibe(map);

      // Calling setStyle has reset all the other style setting that we may have changed (globe, sky, terrain)
      // so now we need to apply them again as they were:
      reaplyProjectionSettings(map);
      reaplyTerrainSettings(map);
    });
    
  } else {
    map.setStyle(`https://api.maptiler.com/maps/outdoor-v2/style.json?key=${import.meta.env.VITE_MAPTILER_API_KEY}`);
    
    map.once("styledata", () => {
      setDaylightVibe(map);

      reaplyProjectionSettings(map);
      reaplyTerrainSettings(map);
    });
  }

}


// Scoping the whole thing
(() => {

  const map = new MLMap({
    container: "map-container",
    style: `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${import.meta.env.VITE_MAPTILER_API_KEY}`,
    hash: true,

    // To go lower and better see the horizon line than with the default (60)
    maxPitch: 85,
  });

  console.log("map", map);

  map.on("load", () => {
    setDaylightVibe(map);
  });
  
  // When clicking on the "toggle globe" button
  document.getElementById("bt-1")?.addEventListener("click", () => {
    toggleGlobe(map);
  });

  // When clicking on the "toggle terrain" button
  document.getElementById("bt-2")?.addEventListener("click", () => {
    toggleTerrain(map);
  });

  let isDaylight = true;
  // When clicking on the "toggle night/day" button
  document.getElementById("bt-3")?.addEventListener("click", () => {
    toggleDaylight(map, isDaylight);
    isDaylight =! isDaylight;
  });

  // Set the vertical field of view with slider
  const sliderElem = document.getElementById("slider-1") as HTMLInputElement;
  sliderElem.value = map.getVerticalFieldOfView().toFixed();
  sliderElem.addEventListener("input", (e) => {
    const val = Number.parseFloat((e.target as HTMLInputElement).value);
    map.setVerticalFieldOfView(val);
    console.log("FOV:", val);
  });

})();