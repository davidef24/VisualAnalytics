// Function to load and process CSV data
function loadCSVData(csvFilePath, callback) {
  d3.csv(csvFilePath).then(function(data) {
    window.filterApplied = false;
    window.dataset = data;
    // Process the data: convert numeric attributes to numbers.
    data.forEach(function(d) {
      d.Tsne_Dim1 = +d.Tsne_Dim1;
      d.Tsne_Dim2 = +d.Tsne_Dim2;
      d.Cluster = +d.Cluster;
      if (isNaN(d.Tsne_Dim1) || isNaN(d.Tsne_Dim2)) {
        console.warn(`Tsne_Dim1 and Tsne_Dim2 are NaN`);
      }
    });

    initializeScales(data); // Set original domains

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
const customColorPalette = d3.schemeDark2;

// Add these at the top of your script (global or in parent scope)
let originalXDomain, originalYDomain;
// Calculate once when first loading data
function initializeScales(fullDataset) {
  originalXDomain = d3.extent(fullDataset, d => d.Tsne_Dim1);
  originalYDomain = d3.extent(fullDataset, d => d.Tsne_Dim2);
}

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
  const margin = { top: 20, right: 200, bottom: 30, left: 40 };
  let width = containerWidth - margin.left - margin.right;
  let height = containerHeight - margin.top - margin.bottom;

  // Append SVG container
  const scatterSvg = d3.select("#scatterplot-container")
    .append("svg")
    .attr("width", containerWidth)
    .attr("height", containerHeight)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const xScale = d3.scaleLinear()
    .domain(originalXDomain) // Use stored domain instead of data's extent
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain(originalYDomain) // Use stored domain instead of data's extent
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
    window.selectedPlayer = d;

    // Trova i giocatori più vicini in base al valore iniziale dello slider
    //const sliderValue = +document.getElementById("radar-slider").value;
    document.getElementById("radar-slider").value = 0;
    document.getElementById("radar-slider-value").textContent = "0";
    const nearestPlayers = findNearestPlayers(d, data, 0);
    const fiveNearest = findNearestPlayers(d, data, 5);
    window.np = fiveNearest;


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
    document.getElementById("line-chart-filter").value = "wage";

 });
 // Add Legend
 const legendWidth = 10;
 const legendHeight = 10;
 const legendSpacing = 15;

 const legend = scatterSvg.append("g")
   .attr("transform", `translate(${width + 10}, 20)`); // Place legend to the right of the chart

 // Legend categories
 const legendData = [
   { color: "#d95f02", label: "Defensive and Physical Players" },
   { color: "#66a61e", label: "Athletic and Technical Players" },
   { color: "#e7298a", label: "Goalkeepers" },
   { color: "#9467bd", label: "Physical Finishers" },
   { color: "#e6ab02", label: "Midfielders" },
   { color: "#1b9e77", label: "Wingers and Attack" }
 ];

 // Add legend items (color boxes and text)
 legendData.forEach((item, index) => {
   legend.append("rect")
     .attr("x", 0)
     .attr("y", index * legendSpacing)
     .attr("width", legendWidth)
     .attr("height", legendHeight)
     .attr("fill", item.color);

   legend.append("text")
     .attr("x", legendWidth + 5)
     .attr("y", index * legendSpacing + legendHeight / 2)
     .attr("dy", ".35em")
     .text(item.label)
     .style("font-size", "12px");
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

document.getElementById("league-filter").addEventListener("change", function () {
  const selectedLeague = this.value; // Ottieni il valore selezionato dal menù
  const filteredData = filterDataByLeague(window.dataset, selectedLeague); // Filtra i dati
  createScatterplot(filteredData); // Aggiorna lo scatterplot con i dati filtrati
});

/**
* Filtra i dati in base alla lega selezionata.
* @param {Array} data - Il dataset completo.
* @param {string} league - La lega selezionata ("all" per nessun filtro).
* @returns {Array} - Il dataset filtrato.
*/
function filterDataByLeague(data, league) {
  if (league === "All Leagues") {
      return data; // Nessun filtro, restituisci tutti i dati
  }
  return data.filter((d) => d.club_league_name === league); // Filtra per lega
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
  //console.log("D3 script loaded!");

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
      { role: "GK", x: 0.11, y: 0.5 },   // Portiere
      { role: "LB", x: 0.27, y: 0.28 },  // Terzino sinistro
      { role: "CB", x: 0.23, y: 0.5 },    // Difensore centrale
      { role: "RB", x: 0.27, y: 0.72 }, // Terzino destro
      { role: "RWB", x: 0.33, y: 0.80 },
      { role: "LWB", x: 0.33, y: 0.20 },
      { role: "LM", x: 0.51, y: 0.28 },  // Centrocampista sinistro
      { role: "CDM", x: 0.41, y: 0.5 }, // Centrocampista centrale
      { role: "CM", x: 0.54, y: 0.5 }, // Centrocampista destro
      { role: "CAM", x: 0.66, y: 0.5 }, // Trequartista
      { role: "LW", x: 0.75, y: 0.22 },    // Attaccante sinistro
      { role: "CF", x: 0.77, y: 0.5 },   // Attaccante centrale
      { role: "ST", x: 0.87, y: 0.5 },
      { role: "RW", x: 0.75, y: 0.78 },    // Attaccante destro
      { role: "RM", x: 0.51, y: 0.72 }    // Attaccante destro
    ];

    const positionColors = {
        "GK": "#ffff33",           
        "CB": "#377eb8",         
        "RWB": "#377eb8",
        "RB": "#377eb8",
        "LWB": "#377eb8",
        "LB": "#377eb8",
        "CM": "#ff7f00",
        "CDM": "#ff7f00", 
        "CAM": "#ff7f00", 
        "LM": "#ff7f00",
        "RM": "#ff7f00",     
        "RW": "#e41a1c",     
        "LW": "#e41a1c",
        "ST": "#e41a1c",
        "CF": "#e41a1c"        
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
      //console.log("Ruoli selezionati:", selectedRoles); // Debug

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
          //console.log("Resetting Scatterplot and Player Information");

          window.filterApplied = false;
        
          // Ripristina lo scatterplot con tutti i dati originali
          createScatterplot(window.dataset); // Assicurati che `window.dataset` contenga i dati originali
          document.getElementById("league-filter").value = "All Leagues";

          const playerInfoDiv = d3.select("#player-info");
          playerInfoDiv.html("<div class='no-data'>Select a player to view details</div>");


          initializeRadarChart();

          // *** Reset del Line Chart ***
          d3.select("#time-series").html('<div class="no-data">Select a player to view progression</div>');

          // Reset della variabile del giocatore selezionato
          selectedPlayer = null;
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
  const margin = { top: 20, right: 60, bottom: 100, left: 50 };
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
      .slice(0, 10); // Take the top 8

  // Print the top 8 features in array format
  //console.log("Top 20 Features:", topFeatures.map(([feature, _]) => feature));
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
      .attr("fill", "#DA5A2A");

  svg.selectAll(".cluster-bar")
      .data(clusterValues)
      .enter()
      .append("rect")
      .attr("class", "cluster-bar")
      .attr("x", (_, i) => x(topFeatureNames[i]) + barWidth)
      .attr("y", d => y(d))
      .attr("width", barWidth)
      .attr("height", d => chartHeight - y(d))
      .attr("fill", "#3B1877");
      // Add legend
    const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${chartWidth - 120},${-margin.top + 20})`); // Position at top-right
  
  // Legend items
  const legendItems = [
    { color: "#DA5A2A", text: `${window.selectedPlayer.name} values` },
    { color: "#3B1877", text: "Cluster Average" }
  ];
  
  // Legend rectangles
  legend.selectAll("rect")
    .data(legendItems)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * 20)
    .attr("width", 15)
    .attr("height", 15)
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

    // Create a container for the player photo
    const playerPhotoContainer = playerInfoDiv.append("div")
      .attr("class", "player-photo-container");

    // Aggiungi l'immagine del giocatore o il placeholder
    playerPhotoContainer.append("img")
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
      .html(`<div class="stat-label" sty>Height</div><div class="stat-value">${player.height_cm} cm</div>`);

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
    .html(`<div class="stat-label" sty>Play styles</div><div class="stat-value">${player.play_styles}</div>`);

    //console.log(window.np);

    playerStats.append("div")
    .attr("class", "player-stat")
    .attr("id", "nearest-div")
    .html(`
        <div class="stat-label">Similar players</div>
        <div class="stat-value">
            ${window.np.map(player => 
                `<a href="#" onclick="handlePlayerClick('${player.player_id}')">${player.name}</a>`
            ).join(", ")}
        </div>
    `);
    
  } else {
    // Se il giocatore non è trovato nel dataset
    playerInfoDiv.html("<div class='no-data'>No player data available</div>");
  }
}

// Define the function to handle clicks
function handlePlayerClick(playerID) {
  const selectedPlayer = window.dataset.find(player => player.player_id === playerID);
  // Filter data to include only players from the same cluster
  const sameClusterData = window.dataset.filter(pla => pla.Cluster === selectedPlayer.Cluster);

  // Call the function to create the bar chart with the clicked player's data
  createBarChart(selectedPlayer, sameClusterData);

  const nearestPlayers = findNearestPlayers(selectedPlayer, window.dataset, 5);

  window.np = nearestPlayers;
  window.selectedPlayer = selectedPlayer;

  // Update player info
  updatePlayerInfo(selectedPlayer);

  // Create the radar chart with the selected player and the nearest players
  createRadarChart(selectedPlayer, []);

  document.getElementById("radar-slider").value = 0;

  // Carica i dati storici e crea il line chart, passando il giocatore selezionato
  loadAndCreateLineChart(selectedPlayer, "wage");
  document.getElementById("line-chart-filter").value = "wage";
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

  // Aggiungi la griglia ogni 20 unità (esagoni o pentagoni tratteggiati)
  const gridLevels = [20, 40, 60, 80, 100];
  gridLevels.forEach(level => {
    const polygonData = Array.from({ length: numAxes }, (_, i) => ({
      value: level,
      angle: i * angleSlice
    }));

    const polygonLine = d3.lineRadial()
      .curve(d3.curveLinearClosed)
      .radius(d => rScale(d.value))
      .angle(d => d.angle);

    svg.append("path")
      .datum(polygonData)
      .attr("class", "grid-polygon")
      .attr("d", polygonLine)
      .style("fill", "none")
      .style("stroke", "#ccc")
      .style("stroke-width", "2px")
      .style("stroke-dasharray", "3,3"); // Linee tratteggiate
  });

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
    .style("stroke-width", "1.5px");

  // Aggiungi le etichette degli assi (più lontane)
  axis.append("text")
    .attr("class", "legend")
    .style("font-size", "12px")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("x", (d, i) => rScale(110) * Math.cos(angleSlice * i - Math.PI / 2)) // Aumentato il raggio per allontanare le etichette
    .attr("y", (d, i) => rScale(110) * Math.sin(angleSlice * i - Math.PI / 2))
    .text(d => d.attribute);
}

function createRadarChart(selectedPlayer, nearestPlayers) {
  //console.log(nearestPlayers);
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
        { attribute: "Shooting", value: (+player.shot_power + +player.long_shots + +player.finishing + +player.positioning + +player.volleys + +player.penalties) / 6 },
        { attribute: "Passing", value: (+player.short_passing + +player.long_passing + +player.crossing + +player.vision + +player.fk_accuracy + +player.curve) / 6 },
        { attribute: "Dribbling", value: (+player.dribbling + +player.agility + +player.balance + +player.reactions + +player.composure + +player.ball_control) / 6 },
        { attribute: "Defending", value: (+player.defensive_awareness + +player.standing_tackle + +player.sliding_tackle + +player.heading_accuracy + +player.interceptions) / 5 },
        { attribute: "Pace", value: (+player.sprint_speed + +player.sprint_speed) / 2 },
        { attribute: "Physics", value: (+player.stamina + +player.jumping + +player.strength + +player.aggression) / 4 }
      ];

  // Dati del giocatore selezionato e dei giocatori vicini
  const playersData = [selectedPlayer, ...nearestPlayers];
  

  // Impostazioni del grafico
  const margin = { top: 10, right: 50, bottom: 60, left: 50 };
  const container = d3.select(`#${containerId}`);
  const width = container.node().clientWidth - margin.left - margin.right;
  const height = container.node().clientHeight - margin.top - margin.bottom;

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

  // Aggiungi la griglia ogni 20 unità (esagoni o pentagoni tratteggiati)
  const gridLevels = [20, 40, 60, 80, 100];
  gridLevels.forEach(level => {
    const polygonData = Array.from({ length: numAxes }, (_, i) => ({
      value: level,
      angle: i * angleSlice
    }));

    const polygonLine = d3.lineRadial()
      .curve(d3.curveLinearClosed)
      .radius(d => rScale(d.value))
      .angle(d => d.angle);

    g.append("path")
      .datum(polygonData)
      .attr("class", "grid-polygon")
      .attr("d", polygonLine)
      .style("fill", "none")
      .style("stroke", "#ccc")
      .style("stroke-width", "1.5px")
      .style("stroke-dasharray", "2,2"); // Linee tratteggiate
  });

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
    .style("stroke-width", "2px");

  // Aggiungi le etichette degli assi (più lontane)
  axis.append("text")
    .attr("class", "legend")
    .style("font-size", "12px")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("x", (d, i) => rScale(115) * Math.cos(angleSlice * i - Math.PI / 2)) // Aumentato il raggio per allontanare le etichette
    .attr("y", (d, i) => rScale(115) * Math.sin(angleSlice * i - Math.PI / 2))
    .text(d => d.attribute);

  // Crea l'area del radar chart
  const radarLine = d3.lineRadial()
    .curve(d3.curveLinearClosed)
    .radius(d => rScale(d.value))
    .angle((d, i) => i * angleSlice);

  // Colori differenti per ciascun giocatore
  const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

  // Seleziona l'elemento tooltip
const tooltip = d3.select("#radar-tooltip");

// Funzione per aggiungere il radar per ciascun giocatore
playersData.forEach((player, index) => {
    const playerAttributes = getAttributes(player);
    
    const radarPath = g.append("path")
        .datum(playerAttributes)
        .attr("class", "radar-area")
        .attr("d", radarLine)
        .style("fill", colorScale(index)) // Riempimento con colore
        .style("fill-opacity", 0.2) // Trasparenza per migliorare la leggibilità
        .style("stroke", colorScale(index)) // Colore del bordo
        .style("stroke-width", "2px") // Spessore del bordo aumentato
        .style("opacity", 1)
        .on("mouseover", function (event) {
            // Mostra la tooltip con il nome del giocatore
            tooltip
                .style("opacity", 1)
                .html(player.name) // Usa il nome del giocatore
                .style("left", `${event.pageX + 10}px`) // Posiziona la tooltip
                .style("top", `${event.pageY - 10}px`);

            // Evidenzia il radar
            d3.select(this)
                .style("stroke-width", "4px") // Aumenta lo spessore del bordo
                .style("fill-opacity", 0.5); // Aumenta l'opacità del riempimento
        })
        .on("mouseout", function () {
            // Nascondi la tooltip
            tooltip.style("opacity", 0);

            // Ripristina lo stile originale del radar
            d3.select(this)
                .style("stroke-width", "2px") // Ripristina lo spessore del bordo
                .style("fill-opacity", 0.2); // Ripristina l'opacità del riempimento
        });
  });
}

// Funzione per aggiornare il radar chart in base al valore dello slider
function updateRadarChart() {
  const sliderValue = +document.getElementById("radar-slider").value;
  document.getElementById("radar-slider-value").textContent = sliderValue;

  if (window.selectedPlayer) {
      // Trova i giocatori più vicini in base al valore dello slider
      const nearestPlayers = findNearestPlayers(window.selectedPlayer, window.dataset, sliderValue);
      
      // Aggiorna il radar chart con i nuovi giocatori
      createRadarChart(window.selectedPlayer, nearestPlayers);
  }
}

// Aggiungi un listener allo slider
document.getElementById("radar-slider").addEventListener("input", function() {
  //console.log("Slider value changed!"); // Debug
  updateRadarChart();
});

function findNearestPlayers(selectedPlayer, data, numNearest) {
  //console.log(selectedPlayer);
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
      if (!value) return 0;
    
      // Rimuove simboli come € e spazi
      let formattedValue = value.replace(/[^\dKM.]/g, ""); 
    
      if (formattedValue.endsWith("M")) {
        return parseFloat(formattedValue.replace("M", "")) * 1_000_000;
      } else if (formattedValue.endsWith("K")) {
        return parseFloat(formattedValue.replace("K", "")) * 1_000;
      }
      
      return parseInt(formattedValue, 10) || 0; // Se non c'è M o K, restituisce un numero normale
    }
    

    // Funzione per calcolare le statistiche (esempio)
    function calculateStatistics(player, fifaVersion) {
      const isGoalkeeper = fifaVersion >= 25 ? (player.positions === "GK") : (player.player_positions === "GK");  // Verifica correttamente la posizione in base alla versione di FIFA
      
      if (isGoalkeeper) {  // Controllo se il giocatore è un portiere
        if (fifaVersion === 25) {
          // Statistiche per i portieri in FIFA 25
          return {
            diving: +player.gk_diving || 0,
            handling: +player.gk_handling || 0,
            kicking: +player.gk_kicking || 0,
            positioning: +player.gk_positioning || 0,
            reflexes: +player.gk_reflexes || 0
          };
        } else if (fifaVersion >= 15 && fifaVersion <= 24) {
          // Statistiche per i portieri nelle versioni FIFA 15-24
          return {
            diving: +player.goalkeeping_diving || 0,
            handling: +player.goalkeeping_handling || 0,
            kicking: +player.goalkeeping_kicking || 0,
            positioning: +player.goalkeeping_positioning || 0,
            reflexes: +player.goalkeeping_reflexes || 0
          };
        }
      } else {
        // Statistiche per i giocatori non portieri
        if (fifaVersion === 25) {
          return {
            pace: (+player.sprint_speed + +player.sprint_speed) / 2 || 0,
            dribbling: (+player.dribbling + +player.agility + +player.balance + +player.reactions + +player.composure + +player.ball_control) / 6 || 0,
            physics: (+player.stamina + +player.jumping + +player.strength + +player.aggression) / 4  || 0,
            shooting: (+player.shot_power + +player.long_shots + +player.finishing + +player.positioning + +player.volleys + +player.penalties) / 6 || 0, // Media tra shot_power e long_shots
            passing: (+player.short_passing + +player.long_passing + +player.crossing + +player.vision + +player.fk_accuracy + +player.curve) / 6 || 0, // Media tra short_passing e long_passing
            defending: (+player.defensive_awareness + +player.standing_tackle + +player.sliding_tackle + +player.heading_accuracy + +player.interceptions) / 5 || 0 // Media tra le statistiche difensive
          };
        } else if (fifaVersion >= 15 && fifaVersion <= 24) {
          // Statistiche per FIFA 15-24 (nomi diversi)
          return {
            pace: +player.pace || 0,
            dribbling: +player.dribbling || 0,
            physics: +player.physic || 0,
            shooting: +player.shooting || 0, // Si usa il valore direttamente
            passing: +player.passing || 0, // Si usa il valore direttamente
            defending: +player.defending || 0 // Si usa il valore direttamente
          };
        }
      }
      // Se la versione di FIFA non è riconosciuta o il giocatore non è un portiere, ritorna un oggetto vuoto
      return {};
    }



    // Normalizziamo i dati FIFA 25
    const fifa25Data = window.dataset.map(player => ({
      id: +player.player_id,  
      year: 25,
      wage: formatWageFifa25(player.wage) || 0,
      value: formatValueFifa25(player.value) || 0, 
      positions: player.positions || "",
      statistics: calculateStatistics(player, 25) // Passa la versione di FIFA (25 in questo caso)
    }));

    // Normalizziamo i dati dal CSV (FIFA 15-24)
    const formattedMalePlayers = malePlayers.map(player => ({
      id: +player.player_id,
      year: +player.fifa_version,
      wage: +player.wage_eur || 0,
      value: +player.value_eur || 0, 
      positions: player.player_positions || "",
      statistics: calculateStatistics(player, +player.fifa_version) // Passa la versione di FIFA
    }));
        // Combiniamo i dataset
    const combinedData = [...formattedMalePlayers, ...fifa25Data];

    // Filtra i dati per il giocatore selezionato
    const playerID = +selectedPlayer.player_id || -1;
    const playerData = combinedData.filter(player => player.id === playerID);

    // LOG per debug
    //console.log("Dati trovati per il giocatore:", playerData);

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
    .style("background", "rgba(0, 0, 0, 0.8)")
    .style("color", "white")
    .style("border", "1px solid white")
    .style("padding", "8px")
    .style("border-radius", "5px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("z-index", "1000");

  // Rimuovi il grafico precedente
  d3.select("#time-series").selectAll("*").remove();

  if (playerData.length === 0) {
    console.warn("Nessun dato disponibile per questo giocatore.");
    return;
  }

  // Ordina i dati per anno
  playerData.sort((a, b) => a.year - b.year);

  // Configurazione del grafico
  const margin = { top: -20, right: 120, bottom: 120, left: 90 };  // Aumentato margine destro e inferiore
  const container = d3.select("#time-series");
  const width = container.node().clientWidth - margin.left - margin.right;  // Calcola larghezza dinamica
  const height = container.node().clientHeight - margin.top - margin.bottom;  // Calcola altezza dinamica

  // Crea l'elemento SVG
  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width + margin.right} ${height}`) // Aggiungi margine destro al viewBox
    .attr("preserveAspectRatio", "xMidYMid meet")  // Mantieni le proporzioni durante il ridimensionamento
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Scala per l'asse X (ora con d3.scaleTime() e formattazione dell'anno)
  const xScale = d3.scaleTime()
    .domain([new Date(d3.min(playerData, d => d.year) + 2000, 0), new Date(d3.max(playerData, d => d.year) + 2000, 0)])  // Aggiungi 2000 all'anno
    .range([0, width]);

  // Colori per le statistiche
  const statisticColors = {
    pace: "steelblue",
    passing: "green",
    shooting: "orange",
    dribbling: "purple",
    physics: "brown",
    defending: "blue",
    diving: "blue",
    handling: "green",
    kicking: "orange",
    positioning: "purple",
    reflexes: "red"
  };

  let yScale;
  let statistics = [];

  if (metric === "statistics") {
    if (playerData[0].positions === "GK") {
      // Statistiche per i portieri
      statistics = ["diving", "handling", "kicking", "positioning", "reflexes"];
    } else {
      // Statistiche per i giocatori di campo
      statistics = ["pace", "physics", "passing", "dribbling", "defending", "shooting"];
    }

    //console.log(playerData[0]);

    // Forza la scala Y tra 0 e 100
    yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([height, 0]);

    statistics.forEach(stat => {
      const line = d3.line()
        .x(d => xScale(new Date(d.year + 2000, 0))) // Usa la data per l'anno
        .y(d => yScale(d.statistics?.[stat] || 0))
        .defined(d => d.statistics?.[stat] !== null && d.statistics?.[stat] !== undefined);

      svg.append("path")
        .datum(playerData)
        .attr("fill", "none")
        .attr("stroke", statisticColors[stat])
        .attr("stroke-width", 2)
        .attr("d", line);

      // Aggiungi i punti con tooltip
      svg.selectAll(".dot-" + stat)
        .data(playerData.filter(d => d.statistics?.[stat] !== null))
        .enter()
        .append("circle")
        .attr("class", "dot-" + stat)
        .attr("cx", d => xScale(new Date(d.year + 2000, 0))) // Usa la data per l'anno
        .attr("cy", d => yScale(d.statistics?.[stat] || 0))
        .attr("r", 4)
        .attr("fill", statisticColors[stat])
        .on("mouseover", function (event, d) {
          tooltip.style("opacity", 1);
          tooltip.html(`<strong>${stat.toUpperCase()}</strong>: ${d.statistics?.[stat] || "N/A"}`)
            .style("left", `${event.pageX + 15}px`)
            .style("top", `${event.pageY - 30}px`);

          d3.select(this)
            .transition().duration(200)
            .attr("r", 6);
        })
        .on("mousemove", function (event) {
          tooltip.style("left", `${event.pageX + 15}px`)
            .style("top", `${event.pageY - 30}px`);
        })
        .on("mouseout", function () {
          tooltip.style("opacity", 0);

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
      .x(d => xScale(new Date(d.year + 2000, 0))) // Usa la data per l'anno
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
      .attr("cx", d => xScale(new Date(d.year + 2000, 0))) // Usa la data per l'anno
      .attr("cy", d => yScale(d[metric]))
      .attr("r", 4)
      .attr("fill", "steelblue")
      .on("mouseover", function (event, d) {
        tooltip.style("opacity", 1);
        tooltip.html(`<strong>${metric.toUpperCase()}</strong>: ${d[metric]}`)
          .style("left", `${event.pageX + 15}px`)
          .style("top", `${event.pageY - 30}px`);

        d3.select(this)
          .transition().duration(200)
          .attr("r", 6);
      })
      .on("mousemove", function (event) {
        tooltip.style("left", `${event.pageX + 15}px`)
          .style("top", `${event.pageY - 30}px`);
      })
      .on("mouseout", function () {
        tooltip.style("opacity", 0);

        d3.select(this)
          .transition().duration(200)
          .attr("r", 4);
      });
  }

  // Aggiungi gli assi
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(d3.timeYear.every(1))) // Forza la visualizzazione degli anni
    .selectAll("text")
    .style("font-size", "12px")
    .attr("dy", "0.5em")
    .attr("text-anchor", "middle")
    .style("transform", "translateY(10px)")  // Aggiungi margine in basso per evitare sovrapposizione
    .style("angle", "45deg"); // Ruota i tick per evitare sovrapposizioni

  svg.append("g")
    .call(d3.axisLeft(yScale));

  // Aggiungi etichette agli assi
  svg.append("text")
    .attr("transform", `translate(${width / 2},${height + margin.bottom - 80})`) // Sposta più in basso
    .style("text-anchor", "middle")
    .style("font-size", "18px") // Opzionale: migliora leggibilità
    .text("year");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "18px")
    .text(metric === "statistics" ? "aggregated statistic" : metric);
}


document.getElementById("line-chart-filter").addEventListener("change", function() {
  const selectedMetric = this.value; // Ottieni la metrica selezionata (wage, value, statistics)
  
  // Chiamata alla funzione per aggiornare il grafico
  loadAndCreateLineChart(selectedPlayer, selectedMetric); 
});


document.addEventListener("DOMContentLoaded", function() {
  const minSlider = document.getElementById("min-slider");
  const maxSlider = document.getElementById("max-slider");
  const minValueDisplay = document.getElementById("min-value");
  const maxValueDisplay = document.getElementById("max-value");
  const sliderTrack = document.getElementById("slider-track");

  function updateSliderValues() {
      const minVal = parseInt(minSlider.value);
      const maxVal = parseInt(maxSlider.value);

      // Prevent overlap
      if (minVal > maxVal) minSlider.value = maxVal;
      if (maxVal < minVal) maxSlider.value = minVal;

      // Update displayed values
      minValueDisplay.textContent = minSlider.value;
      maxValueDisplay.textContent = maxSlider.value;

      // Dynamically update track highlight between sliders
      const minPercent = ((minVal - minSlider.min) / (minSlider.max - minSlider.min)) * 100;
      const maxPercent = ((maxVal - minSlider.min) / (minSlider.max - minSlider.min)) * 100;
      sliderTrack.style.left = minPercent + "%";
      sliderTrack.style.width = (maxPercent - minPercent) + "%";
      sliderTrack.classList.add("active");
  }

  // Attach event listeners
  minSlider.addEventListener("input", updateSliderValues);
  maxSlider.addEventListener("input", updateSliderValues);

  // Initialize values on load
  updateSliderValues();
});



// Event listener for slider change
document.addEventListener("DOMContentLoaded", function() {
  const minSlider = document.getElementById("min-slider");
  const maxSlider = document.getElementById("max-slider");
  const minValueDisplay = document.getElementById("min-value");
  const maxValueDisplay = document.getElementById("max-value");

  function updateScatterplot() {
      const minValue = parseInt(minSlider.value);
      const maxValue = parseInt(maxSlider.value);

      minValueDisplay.textContent = minValue;
      maxValueDisplay.textContent = maxValue;

      if (!window.filterApplied) {
          window.filterApplied = true;
          window.filteredDataset = window.dataset;
      } else {
          console.log("Gonna print dataset already filtered");
      }

      // Filter players based on the slider values (between min and max)
      const filteredPlayers = window.filteredDataset.filter(player => 
          player.overall_rating >= minValue && player.overall_rating <= maxValue
      );

      // Call the scatterplot function with filtered players
      createScatterplot(filteredPlayers);
  }

  // Event listeners for both sliders
  minSlider.addEventListener("input", function() {
      if (parseInt(minSlider.value) > parseInt(maxSlider.value)) {
          minSlider.value = maxSlider.value;
      }
      updateScatterplot();
  });

  maxSlider.addEventListener("input", function() {
      if (parseInt(maxSlider.value) < parseInt(minSlider.value)) {
          maxSlider.value = minSlider.value;
      }
      updateScatterplot();
  });
});