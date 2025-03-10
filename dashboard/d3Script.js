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

function calculateAge(dob) {
  const birthDate = new Date(dob);
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();

  // Adjust age if the birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
  }

  return age;
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
         <strong>${d.name}</strong><br/>
         Position: ${d.positions}<br/>
         Age: ${calculateAge(d.dob)}<br/>
         Overall: ${d.overall_rating}
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
    window.selectedPlayer = selectedPlayer;

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


    // Carica i dati storici e crea il line chart, passando il giocatore selezionato
    loadAndCreateLineChart(d, "wage");

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
          if (!d.positions) return false; // Evita errori se manca il campo

          // Creiamo un array dei ruoli del giocatore
          const playerRoles = d.positions.split(",").map(role => role.trim());
          
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
  const isGoalkeeper = playerData.positions === "GK";

    // Define attributes based on position
  // Define all attributes from playerData
  const attributes = [
    "crossing","finishing","heading_accuracy","short_passing","volleys","dribbling","curve","fk_accuracy","long_passing","ball_control","acceleration","sprint_speed","agility","reactions","balance","shot_power","jumping","stamina","strength","long_shots","aggression","interceptions","positioning","vision","penalties","composure","defensive_awareness","standing_tackle","sliding_tackle","gk_diving","gk_handling","gk_kicking","gk_positioning","gk_reflexes"
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
    { color: "steelblue", text: `${window.selectedPlayer.name} values` },
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

    const playerPhotoUrl = player.image;
    console.log(player.image);
    
    // Function to check if an image URL fails to load
    function checkImage(url, callback) {
        const img = new Image();
        img.src = url;
    
        img.onload = () => callback(url); // Use the image if it loads successfully
        img.onerror = () => {
            console.warn(`Image not found (404): ${url}`);
            callback("../placeholder.png"); // Use placeholder if 404 or other error occurs
        };
    }
    
    // Check the image URL before setting/updating the image
    checkImage(playerPhotoUrl, (finalUrl) => {
        let imgElement = playerInfoDiv.select("img.player-photo");
    
        if (imgElement.empty()) {
            // If no image exists, create one
            playerInfoDiv.append("img")
                .attr("class", "player-photo")
                .attr("src", finalUrl)
                .attr("alt", player.name);
        } else {
            // If image exists, update its src
            imgElement.attr("src", finalUrl);
        }
    });


    // Controlla se il giocatore ha un'immagine reale
    //const playerPhotoUrl = player.real_face.trim() === "Yes"
    //  ? player.image 
    //  : "../placeholder.png"; // Sostituisci con il percorso corretto del placeholder

    // Aggiungi l'immagine del giocatore o il placeholder
    playerInfoDiv.append("img")
      .attr("class", "player-photo")
      .attr("src", playerPhotoUrl)
      .attr("alt", player.name);

    // Aggiungi i dettagli del giocatore
    const playerDetails = playerInfoDiv.append("div")
      .attr("class", "player-details");

    playerDetails.append("div")
      .attr("class", "player-name")
      .text(player.name);

    const playerStats = playerDetails.append("div")
      .attr("class", "player-stats");

    // Aggiungi le statistiche del giocatore
    playerStats.append("div")
      .attr("class", "player-stat")
      .html(`<div class="stat-label">Overall</div><div class="stat-value">${player.overall_rating}</div>`);

    playerStats.append("div")
      .attr("class", "player-stat")
      .html(`<div class="stat-label">Position</div><div class="stat-value">${player.positions}</div>`);

    playerStats.append("div")
      .attr("class", "player-stat")
      .html(`<div class="stat-label">Age</div><div class="stat-value">${calculateAge(player.dob)}</div>`);

      playerStats.append("div")
      .attr("class", "player-stat")
      .html(`
        <div class="stat-grid">
          
          <div class="stat-content">
            <div class="stat-label">Club</div>
            <div class="stat-value">${player.club_name}</div>
          </div>
          <img src="${player.club_logo}" class="club-logo" alt="Club Logo">
        </div>
      `);

    playerStats.append("div")
      .attr("class", "player-stat")
      .html(`<div class="stat-label">Value</div><div class="stat-value">${player.value}</div>`);

    playerStats.append("div")
      .attr("class", "player-stat")
      .html(`<div class="stat-label">Weekly Wage</div><div class="stat-value">${player.wage}</div>`);

    playerStats.append("div")
    .attr("class", "player-stat")
    .html(`<div class="stat-label">Play styles</div><div class="stat-value">${player.play_styles}</div>`);
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
  const getAttributes = (player) => player.positions === "GK"
    ? [
        { attribute: "Diving", value: +player.gk_diving },
        { attribute: "Handling", value: +player.gk_handling },
        { attribute: "Kicking", value: +player.gk_kicking },
        { attribute: "Positioning", value: +player.gk_positioning },
        { attribute: "Reflexes", value: +player.gk_reflexes },
      ]
    : [
        { attribute: "Shooting", value: +player.long_shots },
        { attribute: "Passing", value: +player.long_passing },
        { attribute: "Dribbling", value: +player.dribbling },
        { attribute: "Defending", value: +player.defensive_awareness },
        { attribute: "Movement Speed", value: +player.sprint_speed },
        { attribute: "Power Stamina", value: +player.stamina }
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
      if (player.name === selectedPlayer.name) return null; // Salta il giocatore selezionato stesso

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



function loadAndCreateLineChart(selectedPlayer, selectedMetric) {
  d3.csv("../data/male_players.csv").then(function(malePlayers) {
    // Funzione per formattare lo stipendio (in FIFA 25)
    function formatWageFifa25(wage) {
      let formattedWage = wage.replace(/[^0-9K]/g, "");
      if (formattedWage.endsWith("K")) {
        return parseInt(formattedWage.replace("K", ""), 10) * 1000;
      }
      return parseInt(formattedWage, 10);
    }

    // Funzione per formattare il valore (in FIFA 25)
    function formatValueFifa25(value) {
      let formattedValue = value.replace(/[^0-9KMB]/g, "");
      if (formattedValue.endsWith("M")) {
        return parseFloat(formattedValue.replace("M", "")) * 1000000;
      } else if (formattedValue.endsWith("K")) {
        return parseFloat(formattedValue.replace("K", "")) * 1000;
      }
      return parseInt(formattedValue, 10);
    }

    // Funzione per calcolare le statistiche (esempio)
    function calculateStatistics(player, fifaVersion) {
      if (fifaVersion === 25) {
        // Statistiche per FIFA 25 (dove alcune sono medie di più valori)
        return {
          acceleration: +player.acceleration || 0,
          sprint_speed: +player.sprint_speed || 0,
          dribbling: +player.dribbling || 0,
          stamina: +player.stamina || 0,
          shooting: (+player.shot_power + +player.long_shots) / 2 || 0, // Media tra shot_power e long_shots
          passing: (+player.short_passing + +player.long_passing) / 2 || 0, // Media tra short_passing e long_passing
          defending: (+player.defensive_awareness + +player.standing_tackle + +player.sliding_tackle) / 3 || 0 // Media tra le statistiche difensive
        };
      } else if (fifaVersion >= 15 && fifaVersion <= 24) {
        // Statistiche per FIFA 15-24 (nomi diversi)
        return {
          acceleration: +player.movement_acceleration || 0,
          sprint_speed: +player.movement_sprint_speed || 0,
          dribbling: +player.dribbling || 0,
          stamina: +player.power_stamina || 0,
          shooting: +player.shooting || 0, // Si usa il valore direttamente
          passing: +player.passing || 0, // Si usa il valore direttamente
          defending: +player.defending || 0 // Si usa il valore direttamente
        };
      }
      // Se la versione di FIFA non è riconosciuta, ritorna un oggetto vuoto
      return {};
    }

    // Normalizziamo i dati FIFA 25
    const fifa25Data = window.dataset.map(player => ({
      id: +player.player_id,  
      year: 25,
      wage: formatWageFifa25(player.wage) || 0,
      value: formatValueFifa25(player.value) || 0, 
      statistics: calculateStatistics(player, 25) // Passa la versione di FIFA (25 in questo caso)
    }));

    // Normalizziamo i dati dal CSV (FIFA 15-24)
    const formattedMalePlayers = malePlayers.map(player => ({
      id: +player.player_id,
      year: +player.fifa_version,
      wage: +player.wage_eur || 0,
      value: +player.value_eur || 0, 
      statistics: calculateStatistics(player, +player.fifa_version) // Passa la versione di FIFA
    }));
        // Combiniamo i dataset
    const combinedData = [...formattedMalePlayers, ...fifa25Data];

    // Filtra i dati per il giocatore selezionato
    const playerID = +selectedPlayer.player_id || -1;
    const playerData = combinedData.filter(player => player.id === playerID);

    // LOG per debug
    console.log("Dati trovati per il giocatore:", playerData);

    if (playerData.length === 0) {
      console.warn("Nessun dato trovato per il giocatore con ID:", playerID);
    } else {
      // Passa la metrica selezionata al grafico
      createLineChart(playerData, selectedMetric); // Usa la metrica selezionata
    }
  }).catch(function(error) {
    console.error("Errore nel caricamento del file CSV:", error);
  });
}


function createLineChart(playerData, metric) {
  // Creazione della tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.8)") // Sfondo scuro semi-trasparente
    .style("color", "white") // Testo bianco per contrasto
    .style("border", "1px solid white") // Bordo bianco per maggiore visibilità
    .style("padding", "8px")
    .style("border-radius", "5px")
    .style("font-size", "12px")
    .style("pointer-events", "none") // Evita interferenze con il mouse
    .style("opacity", 0);

  // Rimuovi il grafico precedente
  d3.select("#time-series").selectAll("*").remove();

  if (playerData.length === 0) {
    console.warn("Nessun dato disponibile per questo giocatore.");
    return;
  }

  // Ordina i dati per anno
  playerData.sort((a, b) => a.year - b.year);

  // Filtra gli anni con dati validi
  const yearsWithData = playerData.filter(d => d[metric] !== null).map(d => d.year);
  const sortedYears = yearsWithData.sort((a, b) => a - b);

  // Configurazione del grafico
  const margin = { top: 20, right: 30, bottom: 40, left: 50 };
  const width = 600 - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  // Crea l'elemento SVG
  const svg = d3.select("#time-series")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Scale per l'asse X
  const xScale = d3.scaleBand()
    .domain(sortedYears)
    .range([0, width])
    .padding(0.1);

  // Colori per le statistiche
  const statisticColors = {
    acceleration: "steelblue",
    sprint_speed: "green",
    passing: "orange",
    dribbling: "purple",
    stamina: "red",
    shooting: "brown",
    defending: "blue"
  };

  let yScale;

  if (metric === "statistics") {
    const statistics = ["acceleration", "sprint_speed", "passing", "dribbling", "stamina", "defending", "shooting"];

    statistics.forEach(stat => {
      yScale = d3.scaleLinear()
        .domain([0, d3.max(playerData, d => d.statistics[stat]) || 100])
        .range([height, 0]);

      const line = d3.line()
        .x(d => xScale(d.year) + xScale.bandwidth() / 2)
        .y(d => yScale(d.statistics[stat]))
        .defined(d => d.statistics[stat] !== null && d.statistics[stat] !== undefined);

      svg.append("path")
        .datum(playerData)
        .attr("fill", "none")
        .attr("stroke", statisticColors[stat])
        .attr("stroke-width", 2)
        .attr("d", line);

      // Aggiungi i punti con tooltip
      svg.selectAll(".dot-" + stat)
        .data(playerData.filter(d => d.statistics[stat] !== null))
        .enter()
        .append("circle")
        .attr("class", "dot-" + stat)
        .attr("cx", d => xScale(d.year) + xScale.bandwidth() / 2)
        .attr("cy", d => yScale(d.statistics[stat]))
        .attr("r", 4)
        .attr("fill", statisticColors[stat])
        .on("mouseover", function (event, d) {
          tooltip.transition().duration(200).style("opacity", 1);
          tooltip.html(`Statistica: ${stat}<br>Valore: ${d.statistics[stat]}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");

          // Ingrandire il cerchio
          d3.select(this)
            .transition().duration(200)
            .attr("r", 6);
        })
        .on("mousemove", function (event) {
          tooltip.style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function () {
          tooltip.transition().duration(200).style("opacity", 0);
          
          // Ridurre il cerchio
          d3.select(this)
            .transition().duration(200)
            .attr("r", 4);
        });
    });
  } else {
    yScale = d3.scaleLinear()
      .domain([0, d3.max(playerData, d => d[metric]) || 100000])
      .range([height, 0]);

    const line = d3.line()
      .x(d => xScale(d.year) + xScale.bandwidth() / 2)
      .y(d => yScale(d[metric]))
      .defined(d => d[metric] !== null && d[metric] !== undefined);

    svg.append("path")
      .datum(playerData)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Aggiungi i punti con tooltip
    svg.selectAll(".dot")
      .data(playerData.filter(d => d[metric] !== null))
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", d => xScale(d.year) + xScale.bandwidth() / 2)
      .attr("cy", d => yScale(d[metric]))
      .attr("r", 4)
      .attr("fill", "steelblue")
      .on("mouseover", function (event, d) {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`Metrica: ${metric}<br>Valore: ${d[metric]}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");

        // Ingrandire il cerchio
        d3.select(this)
          .transition().duration(200)
          .attr("r", 6);
      })
      .on("mousemove", function (event) {
        tooltip.style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function () {
        tooltip.transition().duration(200).style("opacity", 0);

        // Ridurre il cerchio
        d3.select(this)
          .transition().duration(200)
          .attr("r", 4);
      });
  }

  // Aggiungi gli assi
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale));

  svg.append("g")
    .call(d3.axisLeft(yScale));

  // Aggiungi etichette agli assi
  svg.append("text")
    .attr("transform", `translate(${width / 2},${height + margin.top + 20})`)
    .style("text-anchor", "middle")
    .text("Year");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text(`${metric.charAt(0).toUpperCase() + metric.slice(1)}`);
}



document.getElementById("line-chart-filter").addEventListener("change", function() {
  const selectedMetric = this.value; // Ottieni la metrica selezionata (wage, value, statistics)
  
  // Chiamata alla funzione per aggiornare il grafico
  loadAndCreateLineChart(selectedPlayer, selectedMetric); 
});





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
  }

  // Filter players based on the slider value
  var filteredPlayers = window.filteredDataset.filter(player => player.overall_rating >= sliderValue);

  // Call the createScatterlot function with the filtered players
  createScatterplot(filteredPlayers);
});