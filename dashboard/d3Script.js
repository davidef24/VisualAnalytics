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
   .attr("opacity", 0.6)
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
      // Filter data to include only players from the same cluster
    const sameClusterData = data.filter(player => player.Cluster === d.Cluster);
    createBarChart(d, sameClusterData); // Call the function to create the bar chart with the clicked player's data

    updatePlayerInfo(d);
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

  svg.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Player vs Cluster Average Attributes");
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

    playerStats.append("div")
      .attr("class", "player-stat")
      .html(`<div class="stat-label">Value</div><div class="stat-value">€${player.value_eur}</div>`);

    playerStats.append("div")
      .attr("class", "player-stat")
      .html(`<div class="stat-label">Wage</div><div class="stat-value">€${player.wage_eur}</div>`);

  } else {
    // Se il giocatore non è trovato nel dataset
    playerInfoDiv.html("<div class='no-data'>No player data available</div>");
  }
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