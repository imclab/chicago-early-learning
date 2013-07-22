/********************************************************
 * Copyright (c) 2013 Azavea, Inc.
 * See LICENSE in the project root for copying permission
 ********************************************************/

'use strict';

define(['jquery', 'Leaflet', 'text!templates/neighborhoodList.html', 'text!templates/locationList.html', 'topojson', 'icons', 'common', CEL.serverVars.gmapRequire, 'styling'], 
    function($, L, neighborhoodList, locationList, topojson, icons, common) {
        
        var map,   // Leaflet map
            gmap,    // Google basemap
            locations,    // Store location data
            neighborhoods,    // Store neighborhood data
            template,    // Hold handlebars template
            layerType = { none: 'none', neighborhood: 'neighborhood', location: 'location'},
            // Keep track of current layer displayed
            currentLayer = layerType.none,
            locationLayer = new L.LayerGroup(),   // Location/school layer group
            neighborhoodLayer = new L.LayerGroup(),   // Neighborhood layer group
            neighborhoodGeojson;    // Store neighborhood geojson

        /**
         * Loads Json data for neighborhoods and locations
         * then displays one based on current zoom level
         */
        var loadData = function() {
            $.when(
                $.getJSON(common.getUrl('location-api'), function(data) {
                    locations = data.locations;
                }),
                $.getJSON(common.getUrl('neighborhood-api'), function(data) {
                    neighborhoods = data;
                }),
                $.getJSON(common.getUrl('neighborhoods-topo'), function(data) {
                    neighborhoodLayer = L.geoJson(null, {
                        style: {
                            color: '#666',
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.3
                        }
                    });
                    neighborhoodGeojson = topojson.feature(data, data.objects.neighborhoods);
                })).then(displayMap);
        };

        /**
         * Controls logic of whether to display locations or neighborhoods
         * based on current zoom level. Called when map is initialized
         * and after a change in zoom level.
         */
        var displayMap = function() {
            var zoom_level = map.getZoom();
            if (currentLayer !== 'neighborhood' && zoom_level < 13) {
                // If not already displaying neighborhoods and zoomed out
                currentLayer = layerType.neighborhood;
                listResults(neighborhoods);
                locationLayer.clearLayers();
                neighborhoodLayer.clearLayers();
                neighborhoodLayer.addData(neighborhoodGeojson);
                map.addLayer(neighborhoodLayer);
            }
            else if (currentLayer !== 'location' && zoom_level >= 13) {
                // If not already displaying locations and zoomed in
                map.removeLayer(neighborhoodLayer);
                map.addLayer(locationLayer);
                currentLayer = layerType.location;
                listResults(locations);
                for(var i = 0; i < locations.length; i++){
                    var lat = locations[i].position.lat,
                        lng = locations[i].position.lng,
                        loc_marker = L.marker([lat, lng], {icon: icons.schoolIcon});
                    locationLayer.addLayer(loc_marker);
                };
            }
        };

        /**
         * Changes list results display using Handlebars templates
         * @param {Array of neighborhoods or locations} data
         */
        var listResults = function(data) {
            if (data.neighborhoods) {
                template = Handlebars.compile(neighborhoodList);
            } else {
                template = Handlebars.compile(locationList);
            }
            $('.locations-wrapper').empty();
            $('.locations-wrapper').append(template(data));
        };

        // Load data and build map when page loads
        return {
            init: function(){
            map = new L.map('map').setView([41.88, -87.62], 10);    // Initialize Leaflet map
            gmap = new L.Google('ROADMAP');    // Add Google baselayer
            map.addLayer(gmap);
            map.on('zoomend', displayMap);    // Set event handler to call displayMap when zoom changes
            loadData();    // Load initial data
            }
        };
    }
);
