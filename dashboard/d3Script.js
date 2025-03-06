let selectedPlayer = null; // Memorizza il giocatore selezionato


// Function to load and process CSV data
function loadCSVData(csvFilePath, callback) {
  d3.csv(csvFilePath).then(function(data) {
    // Process the data: convert numeric attributes to numbers.
    data.forEach(function(d) {
      d.Tsne_Dim1 = +d.Tsne_Dim1;
      d.Tsne_Dim2 = +d.Tsne_Dim2;
      d.Cluster = +d.Cluster;
      if (isNaN(d.Tsne_Dim1) || isNaN(d.Tsne_Dim2)) {
        console.warn(`Tsne_Dim1 and Tsne_Dim2 are NaN`);
      }
    });
  
    callback(data);

  }).catch(function(error) {
    console.error("Error loading the CSV file: ", error);
  });
}

  // Define a color palette for clusters.
  const customColorPalette = [
    "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", // Blues, Oranges, Greens, Reds, Purples
    "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", // Browns, Pinks, Grays, Yellows, Cyans
    "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5", // Light Blues, Light Oranges, Light Greens, Light Reds, Light Purples
    "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5"  // Light Browns, Light Pinks, Light Grays, Light Yellows, Light Cyans
  ];

// Function to create the scatterplot
function createScatterplot(data) {
  // Clear any existing scatterplot in the container.
  d3.select("#scatterplot-container").html("");

  // Get container dimensions dynamically
  const container = d3.select("#scatterplot-container").node();
  const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();

  // Ensure valid dimensions
  if (containerWidth === 0 || containerHeight === 0) {
    console.warn("Container has zero dimensions. Skipping scatterplot rendering.");
    return;
  }

  // Define margins and available width/height
  const margin = { top: 20, right: 20, bottom: 30, left: 40 };
  let width = containerWidth - margin.left - margin.right;
  let height = containerHeight - margin.top - margin.bottom;

  // Append SVG container
  const scatterSvg = d3.select("#scatterplot-container")
    .append("svg")
    .attr("width", containerWidth)
    .attr("height", containerHeight)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Define scales
  const xScale = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Tsne_Dim1))
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Tsne_Dim2))
    .range([height, 0]);

  // Append X axis
  const xAxis = scatterSvg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale));

  // Append Y axis
  const yAxis = scatterSvg.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale));

  // Define color palette
  const colorPalette = customColorPalette;

  // Define tooltip (ensure it exists)
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");

   // Draw all data points
   const circles = scatterSvg.selectAll(".scatter-circle")
   .data(data)
   .enter()
   .append("circle")
   .attr("class", "scatter-circle")
   .attr("cx", d => xScale(d.Tsne_Dim1))
   .attr("cy", d => yScale(d.Tsne_Dim2))
   .attr("r", 3)
   .attr("fill", d => colorPalette[d.Cluster % colorPalette.length])
   .attr("stroke", "black")
   .attr("stroke-width", 0.5)
   .attr("opacity", 0.8)
   .on("mouseover", function(event, d) {
     tooltip.style("display", "block")
       .html(`
         <strong>${d.short_name}</strong><br/>
         Position: ${d.player_positions}<br/>
         Age: ${d.age}<br/>
         Overall: ${d.overall}
       `);
   })
   .on("mousemove", function(event) {
     tooltip.style("left", (event.pageX + 10) + "px")
       .style("top", (event.pageY - 20) + "px");
   })
   .on("mouseout", function() {
     tooltip.style("display", "none");
   })
   .on("click", function(event, d) {
    // Memorizza il giocatore selezionato
    selectedPlayer = d;

    // Trova i giocatori più vicini in base al valore iniziale dello slider
    const sliderValue = +document.getElementById("radar-slider").value;
    const nearestPlayers = findNearestPlayers(d, data, sliderValue);

    // Filter data to include only players from the same cluster
    const sameClusterData = data.filter(player => player.Cluster === d.Cluster);

    // Call the function to create the bar chart with the clicked player's data
    createBarChart(d, sameClusterData);

    // Update player info
    updatePlayerInfo(d);

    // Create the radar chart with the selected player and the nearest players
    createRadarChart(d, nearestPlayers);
 });

  // Add ResizeObserver
  const resizeObserver = new ResizeObserver(entries => {
    const { width: newWidth, height: newHeight } = entries[0].contentRect;

    // Check if dimensions actually changed
    if (newWidth !== containerWidth || newHeight !== containerHeight) {
      width = newWidth - margin.left - margin.right;
      height = newHeight - margin.top - margin.bottom;

      // Update scales
      xScale.range([0, width]);
      yScale.range([height, 0]);

      // Update axes
      xAxis.call(d3.axisBottom(xScale));
      yAxis.call(d3.axisLeft(yScale));

      // Update circle positions
      circles
        .attr("cx", d => xScale(d.Tsne_Dim1))
        .attr("cy", d => yScale(d.Tsne_Dim2));
    }
  });

  resizeObserver.observe(container);

  return scatterSvg;
}


// Placeholder function to update other visualizations
function updateOtherVisualizations(clusterData) {
  console.log("Updating other visualizations with cluster data:", clusterData);
  // Add your logic here to update bar charts, popularity charts, etc.
}

// Define the path to your CSV file.
const csvFilePath = "players_with_tsne_and_clusters_data.csv"; // Update this path

// Load the CSV data and create the scatterplot.
loadCSVData(csvFilePath, function(data) {
  // Save the data for later use (e.g., updating other visualizations).
  //console.log(data);
  window.dataset = data;
  window.filterApplied = false;
  // Create the scatterplot.
  createScatterplot(data);

  // Inizializza il radar chart
  initializeRadarChart();
});

document.addEventListener("DOMContentLoaded", function() {
  console.log("D3 script loaded!");

  // Definisci il container dell'immagine del campo da calcio
  const container = d3.select("#soccer-field")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%");

  // Ottieni le dimensioni effettive del contenitore
  const containerWidth = container.node().getBoundingClientRect().width;
  const containerHeight = container.node().getBoundingClientRect().height;

  // Aggiungi l'immagine del campo da calcio
  container.append("image")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", containerWidth)  // Impostiamo la larghezza in base al contenitore
    .attr("height", containerHeight) // Impostiamo l'altezza in base al contenitore
    .attr("xlink:href", "../field.jpg") // Modifica con il percorso corretto
    .attr("preserveAspectRatio", "xMidYMid meet"); // Mantieni le proporzioni dell'immagine

  // Carica il CSV e gestisci i giocatori
  d3.csv(csvFilePath).then(function(data) {
    // Posizioni relative per la formazione 4-3-3
    const positions = [
      { role: "GK", x: 0.1, y: 0.5 },   // Portiere
      { role: "LB - LWB", x: 0.3, y: 0.2 },  // Terzino sinistro
      { role: "CB", x: 0.2, y: 0.5 },    // Difensore centrale
      { role: "RB - RWB", x: 0.3, y: 0.8 }, // Terzino destro
      { role: "LDM - LCM - LAM - LM", x: 0.5, y: 0.3 },  // Centrocampista sinistro
      { role: "CDM - CM", x: 0.4, y: 0.5 }, // Centrocampista centrale
      { role: "RDM - RCM - RAM - RM", x: 0.5, y: 0.7 }, // Centrocampista destro
      { role: "CAM", x: 0.6, y: 0.5 }, // Trequartista
      { role: "LW - LF - LS", x: 0.75, y: 0.2 },    // Attaccante sinistro
      { role: "CF - ST", x: 0.8, y: 0.5 },   // Attaccante centrale
      { role: "RW - RF - RS", x: 0.75, y: 0.8 }    // Attaccante destro
    ];

    const positionColors = {
        "GK": "#ffff33",           
        "CB": "#377eb8",         
        "RB - RWB": "#377eb8",
        "LB - LWB": "#377eb8",
        "CDM - CM": "#ff7f00", 
        "CAM": "#ff7f00", 
        "LDM - LCM - LAM - LM": "#ff7f00",
        "RDM - RCM - RAM - RM": "#ff7f00",     
        "RW - RF - RS": "#e41a1c",     
        "LW - LF - LS": "#e41a1c",
        "CF - ST": "#e41a1c"       
    };

    // Disegna i pallini per i ruoli
    container.selectAll("circle.role")
      .data(positions)
      .enter()
      .append("circle")
      .attr("class", "role")
      .attr("cx", d => d.x * containerWidth)  // Posizione dinamica
      .attr("cy", d => d.y * containerHeight)  // Posizione dinamica
      .attr("r", 12)
      .attr("fill", d => positionColors[d.role] || "gray")
      .attr("stroke", "black")
      .attr("stroke-width", 1.5)
      .on("click", function(event, d) {
        const selectedRoles = d.role.split("-").map(role => role.trim());
        filterScatterplotByRole(selectedRoles);
      });

    // Testi per i ruoli
    container.selectAll("text")
      .data(positions)
      .enter()
      .append("text")
      .attr("x", d => d.x * containerWidth)
      .attr("y", d => d.y * containerHeight - 15)  // Aggiungi spazio sopra il pallino
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("stroke", "black")
      .attr("stroke-width", "2")
      .attr("paint-order", "stroke")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .text(d => d.role);

    // Funzione per aggiornare lo scatterplot in base ai ruoli selezionati
    function filterScatterplotByRole(selectedRoles) {
      console.log("Ruoli selezionati:", selectedRoles); // Debug

      if(!window.filterApplied){
        window.filterApplied = true;
        window.filteredDataset = window.dataset;
      }
      
      // Filtriamo i dati mantenendo i giocatori che hanno almeno uno dei ruoli selezionati
      window.filteredDataset = window.filteredDataset.filter(d => {
          if (!d.player_positions) return false; // Evita errori se manca il campo

          // Creiamo un array dei ruoli del giocatore
          const playerRoles = d.player_positions.split(",").map(role => role.trim());
          
          // Controlliamo se almeno uno dei ruoli del giocatore è presente nei ruoli selezionati
          const hasMatchingRole = playerRoles.some(role => selectedRoles.includes(role));

          return hasMatchingRole;
      });
      // Ricrea lo scatterplot con i dati filtrati
      createScatterplot(filteredDataset);
    }
    

      // Aggiungi un evento di click ai pallini dei ruoli
      container.selectAll("circle.role")
        .on("click", function(event, d) {
            const selectedRoles = d.role.split(" - ");
            filterScatterplotByRole(selectedRoles);
        });

        document.getElementById("reset-filter").addEventListener("click", function() {
          console.log("Resetting Scatterplot and Player Information");

          window.filterApplied = false;
        
          // Ripristina lo scatterplot con tutti i dati originali
          createScatterplot(window.dataset); // Assicurati che `window.dataset` contenga i dati originali

          const playerInfoDiv = d3.select("#player-info");
          playerInfoDiv.html("<div class='no-data'>Select a player to view details</div>");


          initializeRadarChart();
        });
        

      
  }).catch(error => {
      console.error("Error loading CSV:", error);
  });
});

function createBarChart(playerData, clusterPlayers) {
  const container = d3.select("#bar-chart-card-content");
  container.selectAll("*").remove(); // Clear previous chart

  const width = container.node().clientWidth;
  const height = container.node().clientHeight;
  const margin = { top: 20, right: 30, bottom: 120, left: 50 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const svg = container.append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  // Check if player is a goalkeeper
  const isGoalkeeper = playerData.player_positions === "GK";

    // Define attributes based on position
  // Define all attributes from playerData
  const attributes = [
    "pace", "shooting", "passing", "dribbling", "defending", "physic",
    "attacking_crossing", "attacking_finishing", "attacking_heading_accuracy",
    "attacking_short_passing", "attacking_volleys", "skill_dribbling", "skill_curve",
    "skill_fk_accuracy", "skill_long_passing", "skill_ball_control", "movement_acceleration",
    "movement_sprint_speed", "movement_agility", "movement_reactions", "movement_balance",
    "power_shot_power", "power_jumping", "power_stamina", "power_strength",
    "power_long_shots", "mentality_aggression", "mentality_interceptions",
    "mentality_positioning", "mentality_vision", "mentality_penalties", "mentality_composure",
    "defending_marking_awareness", "defending_standing_tackle", "defending_sliding_tackle",
    "gk_diving", "gk_handling", "gk_kicking", "gk_positioning", "gk_reflexes", "gk_speed"
  ];

  
  // Define attributes based on position
  //const attributes = isGoalkeeper 
  //    ? ["Overall", "GK_Diving", "GK_Handling", "GK_Kicking", "GK_Positioning", "GK_Reflexes", "GK_Speed"]
  //    : ["Overall", "Physic", "Pace", "Shooting", "Passing", "Dribbling", "Defending"];

  // Compute cluster averages dynamically
  const clusterAverages = {};
  attributes.forEach(attr => {
      const lowerAttr = attr.toLowerCase();

      // Extract and filter only valid numeric values
      const values = clusterPlayers
          .map(player => Number(player[lowerAttr])) // Convert to Number to ensure numeric type
          .filter(v => !isNaN(v) && v !== undefined);

      // Compute average, avoiding division by zero
      const avg = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;

      clusterAverages[lowerAttr] = avg; // Store computed average
  });
  // Get the top 8 features with the highest average values
  const topFeatures = Object.entries(clusterAverages)
      .sort((a, b) => b[1] - a[1]) // Sort by value (descending)
      .slice(0, 20); // Take the top 8

  // Print the top 8 features in array format
  console.log("Top 8 Features:", topFeatures.map(([feature, _]) => feature));
  const topFeatureNames = topFeatures.map(([feature]) => feature);
  const playerValues = topFeatureNames.map(feature => playerData[feature]);
  const clusterValues = topFeatures.map(([_, value]) => value);

  const x = d3.scaleBand()
      .domain(topFeatureNames)
      .range([0, chartWidth])
      .padding(0.3);

  const y = d3.scaleLinear()
      .domain([0, 100])
      .range([chartHeight, 0]);

  svg.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "end")  // Change anchor to end
      .attr("dx", "-.8em")          // Adjust horizontal position
      .attr("dy", ".15em")          // Adjust vertical position
      .attr("transform", "rotate(-45)");  // Rotate 45 degrees

  svg.append("g")
      .call(d3.axisLeft(y));

  const barWidth = x.bandwidth() / 2;

  svg.selectAll(".player-bar")
      .data(playerValues)
      .enter()
      .append("rect")
      .attr("class", "player-bar")
      .attr("x", (_, i) => x(topFeatureNames[i]))
      .attr("y", d => y(d))
      .attr("width", barWidth)
      .attr("height", d => chartHeight - y(d))
      .attr("fill", "steelblue");

  svg.selectAll(".cluster-bar")
      .data(clusterValues)
      .enter()
      .append("rect")
      .attr("class", "cluster-bar")
      .attr("x", (_, i) => x(topFeatureNames[i]) + barWidth)
      .attr("y", d => y(d))
      .attr("width", barWidth)
      .attr("height", d => chartHeight - y(d))
      .attr("fill", "orange");
      // Add legend
    const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${chartWidth - 120},${-margin.top + 20})`); // Position at top-right
  
  // Legend items
  const legendItems = [
    { color: "steelblue", text: "Selected Player" },
    { color: "orange", text: "Cluster Average" }
  ];
  
  // Legend rectangles
  legend.selectAll("rect")
    .data(legendItems)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * 20)
    .attr("width", 18)
    .attr("height", 18)
    .attr("fill", d => d.color);
  
  // Legend text
  legend.selectAll("text")
    .data(legendItems)
    .enter()
    .append("text")
    .attr("x", 24)
    .attr("y", (d, i) => i * 20 + 14)
    .text(d => d.text)
    .style("font-size", "12px")
    .style("alignment-baseline", "middle");
}



function updatePlayerInfo(playerData) {
  // Cerca il giocatore in window.dataset
  const player = window.dataset.find(p => 
    p.player_id === playerData.player_id
  );

  const playerInfoDiv = d3.select("#player-info");

  if (player) {
    playerInfoDiv.html("");

    // Controlla se il giocatore ha un'immagine reale
    const hasRealFace = player.real_face === "Yes";
    const playerPhotoUrl = hasRealFace && player.player_face_url && player.player_face_url.trim() !== ""
      ? player.player_face_url 
      : "../placeholder.png"; // Sostituisci con il percorso corretto del placeholder

    // Aggiungi l'immagine del giocatore o il placeholder
    playerInfoDiv.append("img")
      .attr("class", "player-photo")
      .attr("src", playerPhotoUrl)
      .attr("alt", player.short_name);

    // Aggiungi i dettagli del giocatore
    const playerDetails = playerInfoDiv.append("div")
      .attr("class", "player-details");

    playerDetails.append("div")
      .attr("class", "player-name")
      .text(player.short_name);

    const playerStats = playerDetails.append("div")
      .attr("class", "player-stats");

    // Aggiungi le statistiche del giocatore
    playerStats.append("div")
      .attr("class", "player-stat")
      .html(`<div class="stat-label">Overall</div><div class="stat-value">${player.overall}</div>`);

    playerStats.append("div")
      .attr("class", "player-stat")
      .html(`<div class="stat-label">Position</div><div class="stat-value">${player.player_positions}</div>`);

    playerStats.append("div")
      .attr("class", "player-stat")
      .html(`<div class="stat-label">Age</div><div class="stat-value">${player.age}</div>`);

    playerStats.append("div")
      .attr("class", "player-stat")
      .html(`<div class="stat-label">Club</div><div class="stat-value">${player.club_name}</div>`);

    const valueInMillions = player.value_eur ? player.value_eur / 1000000 : 0;

    playerStats.append("div")
      .attr("class", "player-stat")
      .html(`<div class="stat-label">Value</div><div class="stat-value">€${valueInMillions} mln</div>`);

    playerStats.append("div")
      .attr("class", "player-stat")
      .html(`<div class="stat-label">Wage</div><div class="stat-value">€${player.wage_eur}</div>`);

    playerStats.append("div")
    .attr("class", "player-stat")
    .html(`<div class="stat-label">Player traits</div><div class="stat-value">${player.player_traits}</div>`);

    playerStats.append("div")
    .attr("class", "player-stat")
    .html(`<div class="stat-label">Player tags</div><div class="stat-value">${player.player_tags}</div>`);

  } else {
    // Se il giocatore non è trovato nel dataset
    playerInfoDiv.html("<div class='no-data'>No player data available</div>");
  }
}


function initializeRadarChart() {
  const containerId = "radar-chart"; // ID del contenitore
  const margin = { top: 50, right: 50, bottom: 50, left: 50 };
  const width = 400 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  // Definisci gli attributi (assi) del radar chart
  const attributes = [
    { attribute: "1", value: 0 },
    { attribute: "2", value: 0 },
    { attribute: "3", value: 0 },
    { attribute: "4", value: 0 },
    { attribute: "5", value: 0 },
    { attribute: "6", value: 0 }
  ];

  const numAxes = attributes.length;
  const angleSlice = (Math.PI * 2) / numAxes;

  const rScale = d3.scaleLinear()
    .domain([0, 100])
    .range([0, width / 2]);

  // Rimuovi qualsiasi SVG esistente
  d3.select(`#${containerId}`).select("svg").remove();

  // Crea l'elemento SVG
  const svg = d3.select(`#${containerId}`)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${width / 2 + margin.left}, ${height / 2 + margin.top})`);

  // Crea gli assi del radar chart
  const axis = svg.selectAll(".axis")
    .data(attributes)
    .enter()
    .append("g")
    .attr("class", "axis");

  // Aggiungi le linee degli assi
  axis.append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", (d, i) => rScale(100) * Math.cos(angleSlice * i - Math.PI / 2))
    .attr("y2", (d, i) => rScale(100) * Math.sin(angleSlice * i - Math.PI / 2))
    .attr("class", "line")
    .style("stroke", "#ccc")
    .style("stroke-width", "1px");

  // Aggiungi le etichette degli assi
  axis.append("text")
    .attr("class", "legend")
    .style("font-size", "12px")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("x", (d, i) => rScale(110) * Math.cos(angleSlice * i - Math.PI / 2))
    .attr("y", (d, i) => rScale(110) * Math.sin(angleSlice * i - Math.PI / 2))
    .text(d => d.attribute);
}


function createRadarChart(selectedPlayer, nearestPlayers) {
  const containerId = "radar-chart"; // ID del contenitore

  // Determina le statistiche da usare in base alla posizione del giocatore
  const getAttributes = (player) => player.player_positions === "GK"
    ? [
        { attribute: "Diving", value: +player.gk_diving },
        { attribute: "Handling", value: +player.gk_handling },
        { attribute: "Kicking", value: +player.gk_kicking },
        { attribute: "Positioning", value: +player.gk_positioning },
        { attribute: "Reflexes", value: +player.gk_reflexes },
        { attribute: "Speed", value: +player.gk_speed }
      ]
    : [
        { attribute: "Shooting", value: +player.shooting },
        { attribute: "Passing", value: +player.passing },
        { attribute: "Dribbling", value: +player.dribbling },
        { attribute: "Defending", value: +player.defending },
        { attribute: "Movement Speed", value: +player.movement_sprint_speed },
        { attribute: "Power Stamina", value: +player.power_stamina }
      ];

  // Dati del giocatore selezionato e dei giocatori vicini
  const playersData = [selectedPlayer, ...nearestPlayers];
  
  // Impostazioni del grafico
  const margin = { top: 50, right: 50, bottom: 50, left: 50 };
  const width = 400 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const numAxes = getAttributes(selectedPlayer).length;
  const angleSlice = (Math.PI * 2) / numAxes;

  const rScale = d3.scaleLinear()
    .domain([0, 100])
    .range([0, (Math.min(width, height) / 2)]); 

  // Seleziona l'elemento SVG esistente
  const svg = d3.select(`#${containerId}`).select("svg");

  // Seleziona il gruppo centrale esistente (creato in initializeRadarChart)
  const g = svg.select("g");

  // Rimuovi tutti gli elementi esistenti del radar chart
  g.selectAll("*").remove(); // Rimuove tutti gli elementi all'interno del gruppo <g>

  // Crea gli assi del radar chart
  const axis = g.selectAll(".axis")
    .data(getAttributes(selectedPlayer))
    .enter()
    .append("g")
    .attr("class", "axis");

  // Aggiungi le linee degli assi
  axis.append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", (d, i) => rScale(100) * Math.cos(angleSlice * i - Math.PI / 2))
    .attr("y2", (d, i) => rScale(100) * Math.sin(angleSlice * i - Math.PI / 2))
    .attr("class", "line")
    .style("stroke", "#ccc")
    .style("stroke-width", "1px");

  // Aggiungi le etichette degli assi
  axis.append("text")
    .attr("class", "legend")
    .style("font-size", "12px")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("x", (d, i) => rScale(110) * Math.cos(angleSlice * i - Math.PI / 2))
    .attr("y", (d, i) => rScale(110) * Math.sin(angleSlice * i - Math.PI / 2))
    .text(d => d.attribute);

  // Crea l'area del radar chart
  const radarLine = d3.lineRadial()
    .curve(d3.curveLinearClosed)
    .radius(d => rScale(d.value))
    .angle((d, i) => i * angleSlice);

  // Colori differenti per ciascun giocatore
  const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

  // Funzione per aggiungere il radar per ciascun giocatore
  playersData.forEach((player, index) => {
    const playerAttributes = getAttributes(player);
    
    g.append("path")
      .datum(playerAttributes)
      .attr("class", "radar-area")
      .attr("d", radarLine)
      .style("fill", colorScale(index))
      .style("stroke", colorScale(index))
      .style("stroke-width", "2px")
      .style("opacity", 0.4);
  });
}


// Funzione per aggiornare il radar chart in base al valore dello slider
function updateRadarChart() {
  const sliderValue = +document.getElementById("radar-slider").value;
  document.getElementById("radar-slider-value").textContent = sliderValue;

  if (selectedPlayer) {
      // Trova i giocatori più vicini in base al valore dello slider
      const nearestPlayers = findNearestPlayers(selectedPlayer, window.dataset, sliderValue);
      
      // Aggiorna il radar chart con i nuovi giocatori
      createRadarChart(selectedPlayer, nearestPlayers);
  }
}

// Aggiungi un listener allo slider
document.getElementById("radar-slider").addEventListener("input", function() {
  console.log("Slider value changed!"); // Debug
  updateRadarChart();
});

function findNearestPlayers(selectedPlayer, data, numNearest) {
  // Calcola la distanza euclidea tra il giocatore selezionato e tutti gli altri
  const distances = data.map(player => {
      if (player.short_name === selectedPlayer.short_name) return null; // Salta il giocatore selezionato stesso

      const dx = player.Tsne_Dim1 - selectedPlayer.Tsne_Dim1;
      const dy = player.Tsne_Dim2 - selectedPlayer.Tsne_Dim2;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return { player, distance };
  }).filter(d => d !== null); // Rimuove il valore nullo (il giocatore selezionato)

  // Ordina i giocatori per distanza crescente
  distances.sort((a, b) => a.distance - b.distance);

  // Prendi i primi N giocatori più vicini
  return distances.slice(0, numNearest).map(d => d.player);
}

document.addEventListener("DOMContentLoaded", function() {
  const slider = document.getElementById("scatterplot-slider");
  const sliderValue = document.getElementById("slider-value");

  // Update slider value on input event
  slider.addEventListener("input", function() {
      sliderValue.textContent = slider.value;  // Update the text content of the value
  });
});

// Event listener for slider change
document.getElementById("scatterplot-slider").addEventListener("input", function() {
  const sliderValue = this.value;
  document.getElementById("slider-value").textContent = sliderValue;

  if(!window.filterApplied){
    window.filterApplied = true;
    window.filteredDataset = window.dataset;
  }
  else{
    console.log("Gonna print dataset already filtered");
    console.log(window.filteredDataset);
  }

  // Filter players based on the slider value
  var filteredPlayers = window.filteredDataset.filter(player => player.overall >= sliderValue);

  // Call the createScatterlot function with the filtered players
  createScatterplot(filteredPlayers);
});