// Function to load and process CSV data
function loadCSVData(csvFilePath, callback) {
  d3.csv(csvFilePath).then(function(data) {
    // Process the data: convert numeric attributes to numbers.
    data.forEach(function(d) {
      d.Tsne_Dim1 = +d.Tsne_Dim1;
      d.Tsne_Dim2 = +d.Tsne_Dim2;
      d.Cluster = +d.Cluster;
      if (isNaN(d.Tsne_Dim1) || isNaN(d.Tsne_Dim2)) {
        console.warn(`Row ${i}: Tsne_Dim1=${d.Tsne_Dim1}, Tsne_Dim2=${d.Tsne_Dim2}`);
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
function createScatterplot(data, containerId) {
  // Clear any existing scatterplot in the container.
  d3.select(`#${containerId}`).html("");

  // Get container dimensions dynamically
  const container = d3.select(`#${containerId}`).node();
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
  const scatterSvg = d3.select(`#${containerId}`)
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
   .attr("opacity", 0.7)
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
  window.dataset = data;

  // Create the scatterplot.
  createScatterplot(data, "scatterplot-container");
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
    .attr("xlink:href", "../field.jpg"); // Modifica con il percorso corretto


    const fieldContainer = container.node();
    const resizeObserver = new ResizeObserver(() => {
      const containerWidth = fieldContainer.getBoundingClientRect().width;
      const containerHeight = fieldContainer.getBoundingClientRect().height;
  
      container.select("image")
        .attr("width", containerWidth)
        .attr("height", containerHeight);
    });
  
    resizeObserver.observe(fieldContainer);

  // Carica il CSV e gestisci i giocatori
  d3.csv(csvFilePath).then(function(data) {
    // Posizioni relative per la formazione 1-4-3-3
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

      // Filtriamo i dati mantenendo i giocatori che hanno almeno uno dei ruoli selezionati
      const filteredData = window.dataset.filter(d => {
          if (!d.player_positions) return false; // Evita errori se manca il campo

          // Creiamo un array dei ruoli del giocatore
          const playerRoles = d.player_positions.split(",").map(role => role.trim());
          
          // Controlliamo se almeno uno dei ruoli del giocatore è presente nei ruoli selezionati
          const hasMatchingRole = playerRoles.some(role => selectedRoles.includes(role));

          return hasMatchingRole;
      });

      console.log("Giocatori filtrati:", filteredData.length); // Debug

      // Ricrea lo scatterplot con i dati filtrati
      createScatterplot(filteredData, "scatterplot-container");
    }

    // Funzione per ripristinare il filtro dello scatterplot
    document.getElementById("reset-filter").addEventListener("click", function() {
      console.log("Resetting Scatterplot");
    
      // Ripristina lo scatterplot con tutti i dati originali
      createScatterplot(window.dataset, "scatterplot-container");
    });

  }).catch(error => {
      console.error("Error loading CSV:", error);
  });
});
