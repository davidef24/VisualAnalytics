const filters = {
  age: { min: 17, max: 43 },
  role: [], 
  league: "All Leagues"
};

const clustersColors = [
  "#e41a1c", 
  "#377eb8",
  "#ff7f00", 
  "#984ea3",
  "#4daf4a",
  "#a65628"
];

const colorPalette = clustersColors;

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


function applyFilters() {
  let filtered = window.dataset;
  if (filters.age.min !== null && filters.age.max !== null) {
    filtered = filtered.filter(player => {
      const age = calculateAge(player.dob); // Compute age from dob
      return age >= filters.age.min &&
      age <= filters.age.max;
    });
  }
  if (filters.role.length > 0) {
    filtered = filtered.filter(player => {
      if (!player.positions) return false;
      const playerRoles = player.positions.split(",").map(role => role.trim());
      // Check if player has ALL selected roles
      return filters.role.every(role => playerRoles.includes(role));
    });
  }
  if (filters.league) {
    const league = filters.league;
    if (league === "All Leagues") {
      return filtered;
    }
    filtered =  filtered.filter((d) => d.club_league_name === league); // Filtra per lega
  }
  return filtered;
}

function isGoalkeeper(player) {
  return player.positions === "GK"; // Verifica se la posizione è "GK"
}



let comparedPlayer = null;
let compareMode = false;

document.getElementById("compare-mode").addEventListener("change", function() {
  compareMode = this.checked;
  document.getElementById("radar-slider").value = 0;
  document.getElementById("radar-slider-value").textContent = "0";
  const slider = document.getElementById("radar-slider")
  createRadarChart(window.selectedPlayer, []);
  // Controlla se viene disattivata la modalità confronto
  //console.log("Compare Mode:", compareMode);
  if (!compareMode) {
    comparedPlayer = null;
    slider.disabled = false;
    // In questo caso, mostri solo il giocatore originale (quello selezionato inizialmente)
  }
  else{
    slider.disabled = true;
    //console.log("Radar Chart solo per il giocatore originale:", window.selectedPlayer);
    createRadarChart(window.selectedPlayer, []); 
  }
});

function updateScatterplot() {
  const filteredPlayers = applyFilters();
  createScatterplot(filteredPlayers);
  // Update the bar chart if using filtered data
  if (document.getElementById('filtered-data-checkbox').checked && window.selectedPlayer && !window.brushedMode) {
    const sameClusterFiltered = filteredPlayers.filter(player => player.Cluster === window.selectedPlayer.Cluster);
    createBarChart(window.selectedPlayer, sameClusterFiltered);
  }
}

// Function to load and process CSV data
function loadCSVData(csvFilePath, callback) {
  d3.csv(csvFilePath).then(function(data) {
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
  const margin = { top: 20, right: 280, bottom: 30, left: 40 };
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

  // Add x-axis
  scatterSvg.append("g")
  .attr("class", "x axis")
  .attr("transform", `translate(0, ${height})`)
  .call(d3.axisBottom(xScale));
  
  // Add y-axis
  scatterSvg.append("g")
  .attr("class", "y axis")
  .call(d3.axisLeft(yScale));
    
  // Define tooltip (ensure it exists)
  const tooltip = d3.select("body")
    .append("div")
    .style("display", "none")
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
      if (!window.brushedMode) { // Show tooltip only if brush mode is OFF
        tooltip.style("display", "block")
          .html(`
            <strong>${d.name}</strong><br/>
            Position: ${d.positions}<br/>
            Age: ${calculateAge(d.dob)}<br/>
            Overall: ${d.overall_rating}
          `);
      }
    })
    .on("mousemove", function(event) {
      if (!window.brushedMode) { // Move tooltip only if brush mode is OFF
        tooltip.style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px");
      }
    })
    .on("mouseout", function() {
      tooltip.style("display", "none");
    })
    .on("click", function(event, d) {
     // Store the clicked player in the appropriate variable
     if (compareMode) {
        comparedPlayer = d;
    } else {
        // Normal mode
        selectedPlayer = d;
    }
        // Update opacity based on current state
        updateCircleOpacity();
      // Compare mode check
      if (compareMode) {
        if (!comparedPlayer) {
          comparedPlayer = d;
          const isSelectedPlayerGK = isGoalkeeper(selectedPlayer);
          const isComparedPlayerGK = isGoalkeeper(comparedPlayer);

          if (isSelectedPlayerGK !== isComparedPlayerGK) {
            alert("Puoi confrontare solo giocatori dello stesso tipo (Portieri con Portieri, Altri ruoli con Altri ruoli).");
            comparedPlayer = null;
            return;
          }
          createRadarChart(selectedPlayer, [comparedPlayer]);
        } else {
          comparedPlayer = d;
          const isSelectedPlayerGK = isGoalkeeper(selectedPlayer);
          const isComparedPlayerGK = isGoalkeeper(comparedPlayer);

          if (isSelectedPlayerGK !== isComparedPlayerGK) {
            alert("Puoi confrontare solo giocatori dello stesso tipo (Portieri con Portieri, Altri ruoli con Altri ruoli).");
            comparedPlayer = null;
            return;
          }
          createRadarChart(selectedPlayer, [comparedPlayer]);
        }
      } else {
        // Store the selected player
        window.selectedPlayer = d;
        document.getElementById("radar-slider").value = 0;
        document.getElementById("radar-slider-value").textContent = "0";
        const nearestPlayers = findNearestPlayers(d, window.dataset, 0);
        const fiveNearest = findNearestPlayers(d, window.dataset, 5);
        window.np = fiveNearest;

        const sameClusterData = window.dataset.filter(player => player.Cluster === d.Cluster);
        createBarChart(d, sameClusterData);
        updatePlayerInfo(d);
        createRadarChart(d, nearestPlayers);
        loadAndCreateLineChart(d, "wage");
        document.getElementById("line-chart-filter").value = "wage";
      }
    });

    function updateCircleOpacity() {
      if (compareMode) {
          if (selectedPlayer && comparedPlayer) {
              // Both players selected in compare mode
              circles.attr("opacity", player => 
                  (player === selectedPlayer || player === comparedPlayer) ? 1 : 0.1
              );
          } else if (comparedPlayer) {
              // Only compared player selected (first selection)
              circles.attr("opacity", player => 
                  player === comparedPlayer ? 1 : 0.1
              );
          }
      } else {
          // Normal mode
          if (selectedPlayer) {
              circles.attr("opacity", player => 
                  player === selectedPlayer ? 1 : 0.1
              );
          }
      }
  }

  // Define an array to store brushed players
  let brushedPlayers = [];

  // Global flag for brush mode (initially off)
  window.brushedMode = window.brushedMode || false;


  const brush = d3.brush()
  .extent([[0, 0], [width, height]])
  .on("end", function(event) {
    brushed(event);
  });

  // Append brush to the scatterplot
  const brushG = scatterSvg.append("g")
    .attr("class", "brush")
    .call(brush);

  // Enable or disable the brush overlay based on window.brushedMode
  if (window.brushedMode) {
    brushG.raise();
    brushG.select(".overlay").style("pointer-events", "all");
  } else {
    brushG.lower();
    brushG.select(".overlay").style("pointer-events", "none");
  }

  function brushed(event) {
    if (!event.selection) {
      brushedPlayers = [];
      window.brushedMode = false;
      circles.attr("opacity", 0.8);
      return;
    }

    const [[x0, y0], [x1, y1]] = event.selection;

    brushedPlayers = data.filter(d =>
      xScale(d.Tsne_Dim1) >= x0 &&
      xScale(d.Tsne_Dim1) <= x1 &&
      yScale(d.Tsne_Dim2) >= y0 &&
      yScale(d.Tsne_Dim2) <= y1
    );

    window.brushedMode = true;
    window.brushedPlayers = brushedPlayers;

    circles.attr("opacity", d => 
      brushedPlayers.includes(d) ? 1.0 : 0.2
    );

    //updateBarChartWithAverages(avgValues);
    // Hide the brush selection rectangle after the brush event is complete
    brushG.select(".selection").style("display", "none");
    
    // Update pie chart with brushed data
    updatePieChart(brushedPlayers.length > 0 ? brushedPlayers : data);

    // Update player count display
    playerCountGroup.select("text")
      .text(`Displayed Players: ${brushedPlayers.length > 0 ? brushedPlayers.length : data.length}`);
    createBarChart(null, null);
  }

  // Toggle brush mode via a checkbox (ensure you have an element with id 'brushed-player-checkbox' in your HTML)
  d3.select("#brushed-player-checkbox").on("click", function() {
    window.brushedMode = !window.brushedMode;
    if (window.brushedMode) {
      // Activate brush mode: enable pointer events for drawing
      brushG.raise();
      brushG.select(".overlay").style("pointer-events", "all");
      tooltip.style("display", "none");
      //console.log("Brush mode activated");
    } else {
      // Deactivate brush mode: disable pointer events to prevent drawing
      brushG.lower();
      brushG.select(".overlay").style("pointer-events", "none");
      // Add pie chart update when deactivating brush mode
      updatePieChart(data);

      // Clear any current brush selection:
      brushG.call(brush.move, null);
      
      // Also reset player count display
      playerCountGroup.select("text")
          .text(`Players: ${data.length}`);

    }
  });

  // Add Legend
  const legendWidth = 10;
  const legendHeight = 10;
  const legendSpacing = 15;

  const legend = scatterSvg.append("g")
    .attr("transform", `translate(${width + 10}, 20)`);

  const legendData = [
    { color: colorPalette[3], label: "Defensive players" },
    { color: colorPalette[2], label: "Technical players" },
    { color: colorPalette[1], label: "Offensive players" },
    { color: colorPalette[4], label: "Goalkeepers" },
    { color: colorPalette[0], label: "Athletical players" },
  ];

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

  // Add Player Count Display (centered above pie chart)
  const playerCountGroup = scatterSvg.append("g")
    .attr("transform", `translate(${width + margin.right/2}, ${height/2 - 100})`); // Centered above pie
  const playerCountText = playerCountGroup.append("text")
    .attr("text-anchor", "middle")
    .style("font-weight", "bold")
    .style("font-size", "14px")
    .text(`Players: ${data.length}`);

  // Add Pie Chart (centered in remaining space)
  const pieRadius = 60; // Reduced size for better fit
  const pieGroup = scatterSvg.append("g")
    .attr("transform", `translate(${width + margin.right/2}, ${height/2+30})`); // True center

    function updatePieChart(currentData) {
      // Clear existing elements
      pieGroup.selectAll("*").remove();
  
      // Add title (centered above pie)
      pieGroup.append("text")
          .attr("text-anchor", "middle")
          .attr("y", -pieRadius - 30)
          .style("font-size", "14px")
          .style("font-weight", "bold")
          .text("Cluster Distribution");
  
      // Calculate cluster distribution
      const clusterData = Array.from(
          d3.rollup(currentData, v => v.length, d => d.Cluster),
          ([cluster, count]) => ({
              cluster,
              count,
              color: colorPalette[cluster % colorPalette.length]
          })
      ).sort((a, b) => b.count - a.count);
  
      const pie = d3.pie()
          .value(d => d.count)
          .sort(null);
  
      const arc = d3.arc()
          .innerRadius(0)
          .outerRadius(pieRadius);
  
      // Create arcs
      const arcs = pie(clusterData);
  
      // Draw slices
      pieGroup.selectAll("path")
          .data(arcs)
          .enter()
          .append("path")
          .attr("d", arc)
          .attr("fill", d => d.data.color)
          .attr("stroke", "#333")
          .attr("stroke-width", 0.5);
  
      // Create a separate arc for labels to position them nicely
      const labelArc = d3.arc()
      .innerRadius(d => {
          const percentage = (d.data.count/currentData.length * 100);
          return percentage < 5 ? pieRadius * 1.2 : pieRadius * 0.7;
      })
      .outerRadius(d => {
          const percentage = (d.data.count/currentData.length * 100);
          return percentage < 5 ? pieRadius * 1.2 : pieRadius * 0.7;
      });
  
      // Add labels with improved positioning
      pieGroup.selectAll(".pie-label")
          .data(arcs)
          .enter()
          .append("text")
          .attr("class", "pie-label")
          .attr("transform", d => {
              const [x, y] = labelArc.centroid(d);
              return `translate(${x},${y})`;
          })
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em") // Vertical alignment
          .style("font-size", d => {
              const percentage = (d.data.count/currentData.length * 100);
              return percentage < 3 ? "8px" : "10px";
          })
          .style("font-weight", "bold")
          .style("fill", d => {
              const percentage = (d.data.count/currentData.length * 100);
              return percentage < 5 ? "#000" : "#fff"; // Black for small percentages
          })
          .text(d => {
              const percentage = (d.data.count/currentData.length * 100).toFixed(1);
              return `${percentage}%`;
          });
  
      // Add lines connecting labels to slices (optional)
      pieGroup.selectAll(".pie-line")
          .data(arcs.filter(d => (d.data.count/currentData.length * 100) < 5)) // Only for small slices
          .enter()
          .append("line")
          .attr("class", "pie-line")
          .attr("x1", d => arc.centroid(d)[0])
          .attr("y1", d => arc.centroid(d)[1])
          .attr("x2", d => labelArc.centroid(d)[0])
          .attr("y2", d => labelArc.centroid(d)[1])
          .attr("stroke", "#999")
          .attr("stroke-width", 1);
  
      // Update player count
      playerCountText.text(
          currentData === data 
              ? `Total Players: ${data.length}` 
              : `Selected Players: ${currentData.length}`
      );
  }
  

  // Initial pie chart
  updatePieChart(data);
  return scatterSvg;
}


document.getElementById("league-filter").addEventListener("change", function () {
  const selectedLeague = this.value; // Ottieni il valore selezionato dal menù
  filters.league = selectedLeague;
  updateScatterplot(); 
});

// Placeholder function to update other visualizations
function updateOtherVisualizations(clusterData) {
  console.log("Updating other visualizations with cluster data:", clusterData);
  // Add your logic here to update bar charts, popularity charts, etc.
}

// Define the path to your CSV file.
const csvFilePath = "players_with_tsne_and_clusters_data.csv"; // Update this path

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
    .attr("width", containerWidth)
    .attr("height", containerHeight)
    .attr("xlink:href", "../field.jpg")
    .attr("preserveAspectRatio", "xMidYMid meet");

  // Variabile per tenere traccia del cerchio fissato
  let fixedCircle = null;

  // Carica il CSV e gestisci i giocatori
  d3.csv(csvFilePath).then(function(data) {
    // Posizioni relative per la formazione 4-3-3
    const positions = [
      { role: "GK", x: 0.11, y: 0.5 },
      { role: "LB", x: 0.27, y: 0.26 },
      { role: "CB", x: 0.24, y: 0.5 },
      { role: "RB", x: 0.27, y: 0.74 },
      { role: "RWB", x: 0.38, y: 0.78 },
      { role: "LWB", x: 0.38, y: 0.22 },
      { role: "LM", x: 0.6, y: 0.23 },
      { role: "CDM", x: 0.42, y: 0.5 },
      { role: "CM", x: 0.54, y: 0.5 },
      { role: "CAM", x: 0.66, y: 0.5 },
      { role: "LW", x: 0.8, y: 0.25 },
      { role: "CF", x: 0.77, y: 0.5 },
      { role: "ST", x: 0.87, y: 0.5 },
      { role: "RW", x: 0.8, y: 0.75 },
      { role: "RM", x: 0.6, y: 0.77 }
    ];

    const positionColors = {
      "GK": "#333333",           
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

    // Disegna i pallini per i ruoli con i gestori di eventi aggiornati
    container.selectAll("circle.role")
      .data(positions)
      .enter()
      .append("circle")
      .attr("class", "role")
      .attr("cx", d => d.x * containerWidth)
      .attr("cy", d => d.y * containerHeight)
      .attr("r", 12)
      .attr("fill", d => positionColors[d.role] || "gray")
      .attr("stroke", "black")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("mouseenter", function() {
        // Se il cerchio non è fissato, applica l'effetto di highlight
        if (!d3.select(this).classed("fixed")) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", 15)
            .attr("stroke-width", 2.5)
            .attr("stroke", "#ffffff");
        }
      })
      .on("mouseleave", function() {
        // Se il cerchio non è fissato, ripristina lo stato originale
        if (!d3.select(this).classed("fixed")) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", 12)
            .attr("stroke-width", 1.5)
            .attr("stroke", "black");
        }
      })
      .on("click", function(event, d) {
        const circle = d3.select(this);
        const role = d.role;
        const index = filters.role.indexOf(role);
      
        if (index === -1) {
          // Add role if less than 3 selected
          if (filters.role.length < 3) {
            filters.role.push(role);
            circle.classed("fixed", true)
              .interrupt() // Stop any ongoing transitions
              .transition().duration(200)
              .attr("r", 15)
              .attr("stroke-width", 2.5)
              .attr("stroke", "#ffffff");
          }
        } else {
          // Remove role
          filters.role.splice(index, 1);
          circle.classed("fixed", false)
            .interrupt() // Stop any ongoing transitions
            .transition().duration(200)
            .attr("r", 12)
            .attr("stroke-width", 1.5)
            .attr("stroke", "black")
            .on("end", function() {
              const originalFill = circle.style("fill"); 
              circle.attr("fill", originalFill); // Restore original color
            });
        }
      
        updateScatterplot();
      });

    // Testi per i ruoli
    container.selectAll("text")
      .data(positions)
      .enter()
      .append("text")
      .attr("x", d => d.x * containerWidth)
      .attr("y", d => d.y * containerHeight + 3)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("stroke-width", "2")
      .attr("paint-order", "stroke")
      .attr("font-size", "8px")
      .attr("font-weight", "bold")
      .text(d => d.role);

    function updateSliderValues() {
        const minSlider = document.getElementById("min-slider");
        const maxSlider = document.getElementById("max-slider");
        const minValueDisplay = document.getElementById("min-value");
        const maxValueDisplay = document.getElementById("max-value");
        filters.age.min = parseInt(minSlider.value);
        filters.age.max = parseInt(maxSlider.value);
        const sliderTrack = document.getElementById("slider-track");
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

    // Gestione del reset
    document.getElementById("reset-filter").addEventListener("click", function() {
      filters.age.min = 17;
      filters.age.max = 43;
      filters.league = "All Leagues";
      filters.role = [];
      let ds = applyFilters();

      // Reset all role circles
      d3.selectAll(".role.fixed")
      .classed("fixed", false)
      .transition().duration(200)
      .attr("r", 12)
      .attr("stroke-width", 1.5)
      .attr("stroke", "black");

      
      document.getElementById("league-filter").value = "All Leagues";
      document.getElementById("compare-mode").checked = false;
      document.getElementById("radar-slider").disabled = false;
      document.getElementById("radar-slider").value = 0;
      document.getElementById("radar-slider-value").textContent = "0";
      const minSlider = document.getElementById("min-slider");
      const maxSlider = document.getElementById("max-slider");
      minSlider.value = 17;
      maxSlider.value = 43;
      minSlider.textContent = 17;
      maxSlider.textContent = 43;
      document.getElementById("brushed-player-checkbox").checked = false;  // <- Add this
      window.brushedMode = false;  // <- Add this
      updateSliderValues();
      createScatterplot(ds); 
      const playerInfoDiv = d3.select("#player-info");
      playerInfoDiv.html("<div class='no-data'>Select a player to view details</div>");
      initializeRadarChart();
      const barChartDiv = d3.select("#bar-chart-card-content");
      barChartDiv.html("<div class='no-data'>Select a player to compare with cluster</div>");
      d3.select("#time-series").html('<div class="no-data">Select a player to view progression</div>');
      // Ripristina la variabile del giocatore selezionato
      selectedPlayer = null;
      
      // Rimuovi l'effetto fisso se presente
      if (fixedCircle) {
        d3.select(fixedCircle)
          .classed("fixed", false)
          .transition()
          .duration(200)
          .attr("r", 12)
          .attr("stroke-width", 1.5)
          .attr("stroke", "black");
        fixedCircle = null;
      }
    });
  }).catch(error => {
      console.error("Error loading CSV:", error);
  });
});

document.getElementById('filtered-data-checkbox').addEventListener('change', function() {
  if (window.selectedPlayer && !window.brushedMode) {
    const sameClusterData = window.dataset.filter(player => player.Cluster === window.selectedPlayer.Cluster);
    createBarChart(window.selectedPlayer, sameClusterData);
  }
});


function createBarChart(playerData, clusterPlayers) {
  const container = d3.select("#bar-chart-card-content");
  container.selectAll("*").remove(); // Clear previous chart

  // Check if we should use the filtered dataset
  const useFilteredData = document.getElementById('filtered-data-checkbox').checked && !window.brushedMode;
  if (useFilteredData) {
    const filteredData = applyFilters();
    clusterPlayers = filteredData.filter(player => player.Cluster === playerData.Cluster);
  }

  // Create tooltip element (if not already exists)
  const tooltip = d3.select("body").append("div")
        .attr("id", "tooltip")
        .style("position", "absolute")
        .style("padding", "8px")
        .style("background-color", "rgba(0, 0, 0, 0.7)")
        .style("color", "white")
        .style("border", "1px solid #ddd")
        .style("pointer-events", "none")
        .style("display", "none");

  // If brush mode is active, ignore playerData and use brushed players only.
  if (window.brushedMode) {
    // Use the brushed players stored globally (set in createScatterplot)
    clusterPlayers = window.brushedPlayers || [];
    console.log(clusterPlayers);
    const numFeatures = 15; // Show top 15 features
    const attributes = [
      "crossing","finishing","heading_accuracy","short_passing","volleys","dribbling",
      "curve","fk_accuracy","long_passing","ball_control","acceleration","sprint_speed",
      "agility","reactions","balance","shot_power","jumping","stamina","strength",
      "long_shots","aggression","interceptions","positioning","vision","penalties",
      "composure","defensive_awareness","standing_tackle","sliding_tackle",
      "gk_diving","gk_handling","gk_kicking","gk_positioning","gk_reflexes"
    ];

    // Compute average for each attribute among the brushed players.
    const clusterAverages = {};
    attributes.forEach(attr => {
      const lowerAttr = attr.toLowerCase();
      const values = clusterPlayers
          .map(player => Number(player[lowerAttr]))
          .filter(v => !isNaN(v) && v !== undefined);
      const avg = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
      clusterAverages[lowerAttr] = avg;
    });

    // Get the top numFeatures attributes by average value.
    const topFeatures = Object.entries(clusterAverages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, numFeatures);
    const topFeatureNames = topFeatures.map(([feature]) => feature);
    const clusterValues = topFeatures.map(([_, value]) => value);

    // Set up dimensions
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const margin = { top: 20, right: 200, bottom: 80, left: 50 }; // Increased right margin
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = container.append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales and axes
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
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");

    svg.append("g")
      .call(d3.axisLeft(y));

    const barWidth = x.bandwidth() * 0.7;
    // Draw a single set of bars for the cluster (brushed players) average.
    svg.selectAll(".cluster-bar")
      .data(clusterValues)
      .enter()
      .append("rect")
      .attr("class", "cluster-bar")
      .attr("x", (_, i) => x(topFeatureNames[i]) + (x.bandwidth() - barWidth) / 2)
      .attr("y", d => y(d))
      .attr("width", barWidth) // Apply new width
      .attr("height", d => chartHeight - y(d))
      .attr("fill", "#0077b6") // Cluster bar color
      .on("mouseover", function(event, d) {
        tooltip
          .style("left", `${event.pageX}px`)
          .style("top", `${event.pageY}px`)
          .html(`Feature value: ${Number(d).toFixed(1)}`)
          .style("display", "block");
      })
      .on("mouseout", () => tooltip.style("display", "none"));

      // Brushed mode legend positioning
    const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${chartWidth + 20},${-margin.top + 20})`); // Move to margin area

    legend.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", "#0077b6");

    legend.append("text")
      .attr("x", 18)
      .attr("y", 8)
      .text("Brushed Cluster Average")
      .style("font-size", "12px")
      .style("alignment-baseline", "middle");

    return;
  } else {
    // Normal mode: show player vs cluster bars.
    const playerCluster = playerData["Cluster"];
    const clusterColor = "#db504a";
    const playerColor = "#084c61";

    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const margin = { top: 20, right: 200, bottom: 80, left: 50 }; // Increased right margin
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = container.append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const attributes = [
      "crossing","finishing","heading_accuracy","short_passing","volleys","dribbling",
      "curve","fk_accuracy","long_passing","ball_control","acceleration","sprint_speed",
      "agility","reactions","balance","shot_power","jumping","stamina","strength",
      "long_shots","aggression","interceptions","positioning","vision","penalties",
      "composure","defensive_awareness","standing_tackle","sliding_tackle",
      "gk_diving","gk_handling","gk_kicking","gk_positioning","gk_reflexes"
    ];

    const clusterAverages = {};
    attributes.forEach(attr => {
      const lowerAttr = attr.toLowerCase();
      const values = clusterPlayers
        .map(player => Number(player[lowerAttr]))
        .filter(v => !isNaN(v) && v !== undefined);
      const avg = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
      clusterAverages[lowerAttr] = avg;
    });
    // Get the top 10 features (as before)
    const topFeatures = Object.entries(clusterAverages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
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
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");

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
      .attr("fill", playerColor)
      .on("mouseover", function(event, d) {
        tooltip
          .style("left", `${event.pageX - 10}px`)
          .style("top", `${event.pageY + 10}px`)
          .html(`Player feature value: ${Number(d).toFixed(1)}`)
          .style("display", "block");
      })
      .on("mouseout", () => tooltip.style("display", "none"));

    svg.selectAll(".cluster-bar")
      .data(clusterValues)
      .enter()
      .append("rect")
      .attr("class", "cluster-bar")
      .attr("x", (_, i) => x(topFeatureNames[i]) + barWidth)
      .attr("y", d => y(d))
      .attr("width", barWidth)
      .attr("height", d => chartHeight - y(d))
      .attr("fill", clusterColor)
      .on("mouseover", function(event, d) {
        tooltip
          .style("left", `${event.pageX}px`)
          .style("top", `${event.pageY}px`)
          .html(`Cluster average value: ${d.toFixed(1)}`)
          .style("display", "block");
      })
      .on("mouseout", () => tooltip.style("display", "none"));

    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${chartWidth + 20},${-margin.top + 20})`); // Move to margin area

    const legendItems = [
      { color: playerColor, text: `${window.selectedPlayer.name} values` },
      { color: clusterColor, text: "Cluster Average" }
    ];

    legend.selectAll("rect")
      .data(legendItems)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (d, i) => i * 20)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", d => d.color);

    legend.selectAll("text")
      .data(legendItems)
      .enter()
      .append("text")
      .attr("x", 18)
      .attr("y", (d, i) => i * 20 + 8)
      .text(d => d.text)
      .style("font-size", "12px")
      .style("alignment-baseline", "middle");
  }
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
      .html(`<div class="stat-label">FC 25 Overall </div><div class="stat-value">${player.overall_rating}</div>`);

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

    // Assuming player.play_styles is a comma-separated string
    const formattedPlayStyles = player.play_styles
    .split(',')
    .map(style => style.trim())
    .join(', ');

    playerStats.append("div")
    .attr("class", "player-stat")
    .html(`<div class="stat-label" sty>Play styles</div><div class="stat-value">${formattedPlayStyles}</div>`);

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
        { attribute: "Pace", value: (+player.sprint_speed + +player.acceleration) / 2 },
        { attribute: "Physics", value: (+player.stamina + +player.jumping + +player.strength + +player.aggression) / 4 }
      ];

  // Dati del giocatore selezionato e dei giocatori vicini
  const playersData = [selectedPlayer, ...nearestPlayers];
  

  // Impostazioni del grafico
  const margin = { top: 50, right: 50, bottom: 80, left: 50 };
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
  const base = positionCache.get(selectedPlayer.player_id);
  const distances = [];
  
  // Use pre-cached positions
  for (const player of data) {
    if (player.player_id === selectedPlayer.player_id) continue;
    const pos = positionCache.get(player.player_id);
    const dx = pos.x - base.x;
    const dy = pos.y - base.y;
    distances.push({
      player,
      distance: dx*dx + dy*dy // Skip sqrt for performance
    });
  }
  
  return distances.sort((a, b) => a.distance - b.distance)
                  .slice(0, numNearest)
                  .map(d => d.player);
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
            pace: (+player.sprint_speed + +player.acceleration) / 2 || 0,
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

  // 1. Setup Tooltip
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

  // 2. Clear Previous Chart
  d3.select("#time-series").selectAll("*").remove();

  // 3. Validate Data
  if (playerData.length === 0) {
    console.warn("Nessun dato disponibile per questo giocatore.");
    return;
  }

  // 4. Sort Data by Year
  playerData.sort((a, b) => a.year - b.year);

  // 5. Chart Configuration
  if (metric === "statistics"){
    var margin = { top: 20, right: 250, bottom: 70, left: 80 }; // NEW
  }
  else{
    var margin = { top: 20, right: 100, bottom: 70, left: 80 }; // NEW
  }
  
  const container = d3.select("#time-series");
  const containerWidth = container.node().clientWidth;
  const containerHeight = container.node().clientHeight;
  
  const chartWidth = containerWidth - margin.left - margin.right;
  const chartHeight = containerHeight - margin.top - margin.bottom;

  // 6. Create SVG Container
  const svg = container.append("svg")
    .attr("width", containerWidth)
    .attr("height", containerHeight)
    .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  // Main chart area (left column)
  const chartGroup = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Sidebar group (right column - contains legend and trends)
  const sidebarGroup = svg.append("g")
    .attr("transform", `translate(${margin.left + chartWidth + 40}, ${margin.top})`);

  // 7. Define Scales
  const xScale = d3.scaleTime()
    .domain([new Date(d3.min(playerData, d => d.year) + 2000, 0), new Date(d3.max(playerData, d => d.year) + 2000, 0)])
    .range([0, chartWidth]);

  let yScale;
  let statistics = [];

  // Revised tooltip position handler using page coordinates directly.
  function updateTooltipPosition(event) {
    let x = event.pageX + 15;
    let y = event.pageY - 30;
    const tooltipNode = tooltip.node();
    if (tooltipNode) {
      // Use window.innerWidth for boundary check
      if (x + tooltipNode.offsetWidth > window.innerWidth) {
        x = event.pageX - tooltipNode.offsetWidth - 15;
      }
      if (y < 0) {
        y = event.pageY + 15;
      }
      tooltip.style("left", `${x}px`)
             .style("top", `${y}px`);
    }
  }

  function createLegendAndTrends(sidebarElement, statistics, colors, insights) {
    // Compact Legend Section
    const legendGroup = sidebarElement.append("g")
      .attr("class", "legend")
      .attr("transform", "translate(0, 0)");

    statistics.forEach((stat, index) => {
      const legendItem = legendGroup.append("g")
        .attr("transform", `translate(0, ${20 * index})`);

      legendItem.append("rect")
        .attr("width", 14)
        .attr("height", 14)
        .attr("fill", colors[index % colors.length]);

      legendItem.append("text")
        .attr("x", 20)
        .attr("y", 7)
        .style("font-size", "11px")
        .text(stat.charAt(0).toUpperCase() + stat.slice(1));
    });

    // Process insights: sort, limit to 7, and add signs
    const processedInsights = insights
      .sort((a, b) => b.percentage - a.percentage) // Sort by absolute value descending
      .slice(0, 7) // Take top 7
      .map(insight => ({
        ...insight,
        // Add negative sign for decreases
        percentage: insight.direction === "decreased" 
                   ? `-${insight.percentage}%` 
                   : `+${insight.percentage}%`
      }));

    // Trends Section with Arrows
    const trendsGroup = sidebarElement.append("g")
      .attr("class", "trends")
      .attr("transform", `translate(0, ${20 * statistics.length + 20})`);

    trendsGroup.append("text")
      .attr("class", "sidebar-title")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text("Performance Trends");

    const trendsContent = trendsGroup.append("g")
      .attr("transform", "translate(0, 20)");

    if (processedInsights.length > 0) {
      processedInsights.forEach((insight, i) => {
        const trendItem = trendsContent.append("g")
          .attr("transform", `translate(0, ${25 * i})`);

        // Add colored arrow
        const arrowColor = insight.direction === "increased" ? "#4CAF50" : "#F44336";
        trendItem.append("text")
          .attr("x", 0)
          .attr("y", 0)
          .attr("dy", "0.32em")
          .style("font-size", "16px")
          .style("fill", arrowColor)
          .text(insight.direction === "increased" ? "↑" : "↓");

        // Single line with all information
        trendItem.append("text")
          .attr("x", 20)
          .attr("y", 0)
          .style("font-size", "12px")
          .html(`
            ${insight.stat.toUpperCase()} 
            <tspan style="fill:${arrowColor}">${insight.percentage}</tspan>
            <tspan style="fill:#666"> 
              | ${insight.years.join("-")}
            </tspan>
          `);
      });
    } else {
      trendsContent.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .style("font-size", "12px")
        .text("No significant trends detected");
    }
  }

  // New Insight Detection Function
  function searchForInsights(playerData, statistics) {
    const insights = [];
    const threshold = 10; // 10% change threshold
    statistics.forEach(stat => {
      const validData = playerData
        .filter(d => d.statistics?.[stat] !== null && d.statistics?.[stat] !== undefined)
        .sort((a, b) => a.year - b.year);
      if (validData.length < 2) return;
      for (let i = 1; i < validData.length; i++) {
        const prev = validData[i - 1].statistics[stat];
        const current = validData[i].statistics[stat];
        const change = ((current - prev) / prev) * 100;
        if (Math.abs(change) >= threshold) {
          insights.push({
            stat,
            direction: change > 0 ? "increased" : "decreased",
            percentage: Math.abs(change).toFixed(1),
            years: [validData[i - 1].year, validData[i].year],
            duration: 1
          });
        }
      }
      if (validData.length > 2) {
        const overallChange = ((validData[validData.length - 1].statistics[stat] - validData[0].statistics[stat]) / validData[0].statistics[stat] * 100);
        if (Math.abs(overallChange) >= threshold) {
          const isAlreadyCovered = insights.some(insight => 
            insight.stat === stat && 
            insight.years[0] <= validData[0].year && 
            insight.years[1] >= validData[validData.length - 1].year
          );
          if (!isAlreadyCovered) {
            insights.push({
              stat,
              direction: overallChange > 0 ? "increased" : "decreased",
              percentage: Math.abs(overallChange).toFixed(1),
              years: [validData[0].year, validData[validData.length - 1].year],
              duration: validData.length - 1
            });
          }
        }
      }
    });
    return insights;
  }

  // 8. Handle Statistics Metric
  if (metric === "statistics") {
    // Define statistics based on player position
    statistics = playerData[0].positions === "GK"
      ? ["diving", "handling", "kicking", "positioning", "reflexes"]
      : ["pace", "physics", "passing", "dribbling", "defending", "shooting"];

    // Find insights/trends
    const insights = searchForInsights(playerData, statistics);
    // Create legend and trend information in the sidebar (left side of chart)
    createLegendAndTrends(sidebarGroup, statistics, clustersColors, insights);

    // Set Y-Scale for statistics (0 to 100)
    yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([chartHeight, 0]);

    // Draw Lines and Dots for Each Statistic in the chartGroup
    statistics.forEach((stat, index) => {
      const color = clustersColors[index % clustersColors.length];
      const line = d3.line()
        .x(d => xScale(new Date(d.year + 2000, 0)))
        .y(d => yScale(d.statistics?.[stat] || 0))
        .defined(d => d.statistics?.[stat] !== null && d.statistics?.[stat] !== undefined);

      const path = chartGroup.append("path")
        .datum(playerData)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("opacity", 1)
        .attr("class", `line-${stat}`)
        .attr("d", line);

      chartGroup.selectAll(".dot-" + stat)
        .data(playerData.filter(d => d.statistics?.[stat] !== null))
        .enter()
        .append("circle")
        .attr("class", "dot-" + stat)
        .attr("cx", d => xScale(new Date(d.year + 2000, 0)))
        .attr("cy", d => yScale(d.statistics?.[stat] || 0))
        .attr("r", 4)
        .attr("fill", color)
        .attr("stroke", "white")
        .attr("stroke-width", 0)
        .on("mouseover", function (event, d) {
          updateTooltipPosition(event);
          const value = d.statistics?.[stat] !== null ? Math.round(d.statistics[stat]) : "N/A";
          tooltip.style("opacity", 1)
            .html(`<strong>${stat.toUpperCase()}</strong>: ${value}`)
            .style("display", "block");
          chartGroup.selectAll("path").transition().duration(50).attr("opacity", 0.3);
          chartGroup.selectAll('[class^="dot-"]').transition().duration(50).attr("opacity", 0.3);
          chartGroup.select(`.line-${stat}`).transition().duration(50).attr("opacity", 1).attr("stroke-width", 3);
          chartGroup.selectAll(`.dot-${stat}`).transition().duration(50).attr("opacity", 1).attr("r", 6);
        })
        .on("mousemove", function (event) {
          updateTooltipPosition(event);
        })
        .on("mouseout", function () {
          tooltip.style("opacity", 0).style("display", "none");
          chartGroup.selectAll("path").transition().duration(20).attr("opacity", 1).attr("stroke-width", 2);
          chartGroup.selectAll('[class^="dot-"]').transition().duration(20).attr("opacity", 1).attr("r", 4);
        });

      path.on("mouseover", function (event) {
        updateTooltipPosition(event);
        chartGroup.selectAll("path").transition().duration(20).attr("opacity", 0.3);
        chartGroup.selectAll('[class^="dot-"]').transition().duration(20).attr("opacity", 0.3);
        chartGroup.select(`.line-${stat}`).transition().duration(20).attr("opacity", 1).attr("stroke-width", 3);
        chartGroup.selectAll(`.dot-${stat}`).transition().duration(20).attr("opacity", 1).attr("r", 6);
      }).on("mouseout", function (event) {
        updateTooltipPosition(event);
        chartGroup.selectAll("path").transition().duration(20).attr("opacity", 1).attr("stroke-width", 2);
        chartGroup.selectAll('[class^="dot-"]').transition().duration(20).attr("opacity", 1).attr("r", 4);
      });
    });
  } else {
    // 9. Handle Non-Statistics Metric
    yScale = d3.scaleLinear()
      .domain([0, d3.max(playerData, d => d[metric]) || 100000])
      .range([chartHeight, 0]);

    const line = d3.line()
      .x(d => xScale(new Date(d.year + 2000, 0)))
      .y(d => yScale(d[metric]))
      .defined(d => d[metric] !== null && d[metric] !== undefined);

    chartGroup.append("path")
      .datum(playerData)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line);

    chartGroup.selectAll(".dot")
      .data(playerData.filter(d => d[metric] !== null))
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", d => xScale(new Date(d.year + 2000, 0)))
      .attr("cy", d => yScale(d[metric]))
      .attr("r", 4)
      .attr("fill", "steelblue")
      .on("mouseover", function (event, d) {
        const value = d[metric] !== null ? Math.round(d[metric]) : "N/A";
        tooltip.style("opacity", 1)
          .html(`<strong>${metric.toUpperCase()}</strong>: ${value}`)
          .style("display", "block");
          updateTooltipPosition(event);
          d3.select(this).transition().duration(200).attr("r", 6);
      })
      .on("mousemove", function (event) {
          updateTooltipPosition(event);
      })
      .on("mouseout", function () {
        tooltip.style("opacity", 0);
        d3.select(this).transition().duration(200).attr("r", 4);
      });
  }

  // 10. Add Axes
  chartGroup.append("g")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(d3.axisBottom(xScale).ticks(d3.timeYear.every(1)))
    .selectAll("text")
    .style("font-size", "12px")
    .attr("dy", "0.5em")
    .attr("text-anchor", "middle")
    .style("transform", "translateY(10px)")
    .style("angle", "45deg");

  chartGroup.append("g")
    .call(d3.axisLeft(yScale));

  // 11. Add Axis Labels
  chartGroup.append("text")
    .attr("transform", `translate(${chartWidth / 2},${chartHeight + 40})`)
    .style("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Year");

  chartGroup.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (chartHeight / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "16px")
    .text(metric === "statistics" ? "Rating (0-100)" : (metric.charAt(0).toUpperCase() + metric.slice(1)));
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
  filters.age.min = parseInt(minSlider.value);
  filters.age.max = parseInt(maxSlider.value);
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
  // Event listeners for both sliders
  minSlider.addEventListener("input", function() {
      const maxSlider = document.getElementById("max-slider");
      const minValue = parseInt(minSlider.value);
      const maxValue = parseInt(maxSlider.value);

      if (minValue > maxValue) {
          minSlider.value = maxSlider.value;
      }
      filters.age.min = minValue;
      updateScatterplot();
  });

  maxSlider.addEventListener("input", function() {
      const minSlider = document.getElementById("min-slider");
      const minValue = parseInt(minSlider.value);
      const maxValue = parseInt(maxSlider.value);
      if (maxValue < minValue) {
          maxSlider.value = minSlider.value;
      }
      filters.age.max = maxValue;
      updateScatterplot();
  });
});

const positionCache = new Map();

// Load the CSV data and create the scatterplot.
loadCSVData(csvFilePath, function(data) {
  // Save the data for later use (e.g., updating other visualizations).
  //console.log(data);
  window.dataset = data;
  // Precompute positions once
  
  window.dataset.forEach((d, i) => {
    positionCache.set(d.player_id, {
      x: d.Tsne_Dim1,
      y: d.Tsne_Dim2,
      index: i
    });
  });
  // Create the scatterplot.
  createScatterplot(data);

  // Inizializza il radar chart
  initializeRadarChart();
});