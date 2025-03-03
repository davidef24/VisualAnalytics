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
         Position: ${d.club_position}<br/>
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

  d3.csv(csvFilePath).then(function(data) {

      // Posizioni aggiornate per la formazione 1-4-3-3
      const positions = [
          { role: "GK", x: 50, y: 200 },   // Portiere
          { role: "LB - LWB", x: 170, y: 50 },  // Terzino sinistro
          { role: "CB - LCB", x: 130, y: 150 }, // Difensore centrale
          { role: "CB - RCB", x: 130, y: 250 }, // Difensore centrale
          { role: "RB - RWB", x: 170, y: 350 }, // Terzino destro
          { role: "LDM - LCM - LAM - LM", x: 320, y: 110 },  // Centrocampista sinistro
          { role: "CDM - CM - CAM", x: 280, y: 200 }, // Centrocampista centrale
          { role: "RDM - RCM - RAM - RM", x: 320, y: 290}, // Centrocampista destro
          { role: "LW - LF - LS", x: 450, y: 75 },    // Attaccante sinistro
          { role: "CF - ST", x: 475, y: 200 },   // Attaccante centrale
          { role: "RW - RF - RS", x: 450, y: 325 }    // Attaccante destro
      ];

      const positionColors = {
          "GK": "#ffff33",           
          "CB - LCB": "#377eb8",   
          "CB - RCB": "#377eb8",        
          "RB - RWB": "#377eb8",
          "LB - LWB": "#377eb8",
          "CDM - CM - CAM": "#ff7f00", 
          "LDM - LCM - LAM - LM": "#ff7f00",
          "RDM - RCM - RAM - RM": "#ff7f00",     
          "RW - RF - RS": "#e41a1c",     
          "LW - LF - LS": "#e41a1c",
          "CF - ST": "#e41a1c"       
      };
      

      const svg = d3.select("#soccer-field").append("svg")
          .attr("width", 600)
          .attr("height", 400);

      // Disegna il campo
      svg.append("rect")
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", 600)
          .attr("height", 400)
          .attr("fill", "#4d9221");

      // Disegnare le righe verticali alternate
      const stripeWidth = 54.5;  // Larghezza delle strisce verticali
      const colors = ["#4d9221", "#7fbc41"];  // Verde e verde chiaro

      // Crea le righe verticali alternate
      for (let i = 0; i < 560; i += stripeWidth) {
          svg.append("rect")
              .attr("x", i)
              .attr("y", 10)
              .attr("width", stripeWidth)
              .attr("height", 380)
              .attr("fill", colors[(i / stripeWidth) % 2]);  // Alterna tra verde e verde chiaro
      }

      // Linee del campo
      svg.append("rect")  // Bordo del campo
          .attr("x", 10)
          .attr("y", 10)
          .attr("width", 580)
          .attr("height", 380)
          .attr("stroke", "white")
          .attr("fill", "none")
          .attr("stroke-width", 3);

      svg.append("line")  // Linea di metà campo
          .attr("x1", 300)
          .attr("y1", 10)
          .attr("x2", 300)
          .attr("y2", 390)
          .attr("stroke", "white")
          .attr("stroke-width", 3);

      // Cerchio di centrocampo
      svg.append("circle") // Cerchio di centrocampo
          .attr("cx", 300)
          .attr("cy", 200)
          .attr("r", 50)
          .attr("stroke", "white")
          .attr("fill", "none")
          .attr("stroke-width", 3);

      // Aree di rigore
      svg.append("rect") // Area di rigore sinistra
          .attr("x", 10)
          .attr("y", 75)
          .attr("width", 120)
          .attr("height", 250)
          .attr("stroke", "white")
          .attr("fill", "none")
          .attr("stroke-width", 3);

      svg.append("rect") // Area di rigore destra
          .attr("x", 470)
          .attr("y", 75)
          .attr("width", 120)
          .attr("height", 250)
          .attr("stroke", "white")
          .attr("fill", "none")
          .attr("stroke-width", 3);

      // Porte
      svg.append("rect") // Porta sinistra
          .attr("x", 10)
          .attr("y", 150)
          .attr("width", 40)
          .attr("height", 100)
          .attr("stroke", "white")
          .attr("fill", "none")
          .attr("stroke-width", 3);

      svg.append("rect") // Porta destra
          .attr("x", 550)
          .attr("y", 150)
          .attr("width", 40)
          .attr("height", 100)
          .attr("stroke", "white")
          .attr("fill", "none")
          .attr("stroke-width", 3);

      // Quarti di cerchio agli angoli (verso l'interno)
      const quarterCircleRadius = 10;
      const quarterCircleArc = d3.arc()
          .innerRadius(0)
          .outerRadius(quarterCircleRadius)
          .startAngle(0)
          .endAngle(Math.PI / 2);

      // Angolo in alto a sinistra
      svg.append("path")
          .attr("d", quarterCircleArc)
          .attr("transform", "translate(10, 10) rotate(90)")  // Invertito verso l'interno
          .attr("stroke", "white")
          .attr("fill", "none")
          .attr("stroke-width", 3);

      // Angolo in alto a destra
      svg.append("path")
          .attr("d", quarterCircleArc)
          .attr("transform", "translate(590, 10) rotate(180)")  // Invertito verso l'interno
          .attr("stroke", "white")
          .attr("fill", "none")
          .attr("stroke-width", 3);

      // Angolo in basso a sinistra
      svg.append("path")
          .attr("d", quarterCircleArc)
          .attr("transform", "translate(10, 390) rotate(0)")  // Invertito verso l'interno
          .attr("stroke", "white")
          .attr("fill", "none")
          .attr("stroke-width", 3);

      // Angolo in basso a destra
      svg.append("path")
          .attr("d", quarterCircleArc)
          .attr("transform", "translate(590, 390) rotate(-90)")  // Invertito verso l'interno
          .attr("stroke", "white")
          .attr("fill", "none")
          .attr("stroke-width", 3);

      // Punti sul centrocampo e per i calci di rigore
      const penaltySpotRadius = 4;
      const centerSpotRadius = 4;

      // Punto di centrocampo
      svg.append("circle")
          .attr("cx", 300)
          .attr("cy", 200)
          .attr("r", centerSpotRadius)
          .attr("fill", "white");

      // Punti per i calci di rigore
      svg.append("circle")
          .attr("cx", 100)   // Punti di rigore sinistro
          .attr("cy", 200)
          .attr("r", penaltySpotRadius)
          .attr("fill", "white");

      svg.append("circle")
          .attr("cx", 500)   // Punti di rigore destro
          .attr("cy", 200)
          .attr("r", penaltySpotRadius)
          .attr("fill", "white");

      // Dati per l'ellisse (larghezza e altezza)
      const semiCircleHeight = 25;  // Altezza dell'ellisse (più piccola)

      // Disegnare un semicircolo (ellisse schiacciata)
      const semiCircleArc = d3.arc()
          .innerRadius(0)
          .outerRadius(semiCircleHeight)  // L'altezza definisce il raggio dell'ellisse
          .startAngle(0)
          .endAngle(Math.PI);  // Solo metà cerchio (semicircolo)

      // Aggiungi il semicircolo a sinistra (fuori dall'area di rigore sinistra)
      svg.append("path")
          .attr("d", semiCircleArc)
          .attr("transform", "translate(130, 200) scale(1, 1.6)")  // Scale solo sulla direzione Y per schiacciare l'ellisse
          .attr("stroke", "white")
          .attr("fill", "none")
          .attr("stroke-width", 2.5)  // Mantieni la larghezza del bordo invariata
          .style("smoothEdges");  // Mantiene il bordo senza sfocature

      // Aggiungi il semicircolo a destra (fuori dall'area di rigore destra)
      svg.append("path")
          .attr("d", semiCircleArc)
          .attr("transform", "translate(470, 200) rotate(180) scale(1, 1.6)")  // Scale solo sulla direzione Y per schiacciare l'ellisse
          .attr("stroke", "white")
          .attr("fill", "none")
          .attr("stroke-width", 2.5)  // Mantieni la larghezza del bordo invariata
          .style("smoothEdges");  // Mantiene il bordo senza sfocature

      // Cerchi per i ruoli (pallini)
      svg.selectAll("circle.role")
      .data(positions)
      .enter()
      .append("circle")
      .attr("class", "role")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", 12)
      .attr("fill", d => positionColors[d.role] || "gray")
      .attr("stroke", "black")
      .attr("stroke-width", 1.5)
      .on("click", function(event, d) {
        filterScatterplotByRole(d.role);
      });



      // Testi per i ruoli
      svg.selectAll("text")
      .data(positions)
      .enter()
      .append("text")
      .attr("x", d => d.x)
      .attr("y", d => d.y - 15)  // Aggiungi spazio sopra il pallino
      .attr("text-anchor", "middle")
      .attr("fill", "white")  // Colore del testo
      .attr("stroke", "black")  // Bordo nero
      .attr("stroke-width", "2")  // Spessore del bordo
      .attr("paint-order", "stroke")  // Priorità allo stroke per visibilità
      .attr("font-size", "10px")  // Font size ridotto
      .attr("font-weight", "bold")
      .text(d => d.role);


      // Funzione per aggiornare lo scatterplot in base al ruolo selezionato
      function filterScatterplotByRole(selectedRole) {
        // Filtra i dati in base al ruolo
        const filteredData = window.dataset.filter(d => d.player_positions.includes(selectedRole));

        // Ricrea lo scatterplot con i dati filtrati
        createScatterplot(filteredData, "scatterplot-container");
      }

      // Aggiungi un evento di click ai pallini dei ruoli
      svg.selectAll("circle.role")
        .on("click", function(event, d) {
            const selectedRole = d.role.split(" - ")[0]; // Prendi solo il primo ruolo elencato
            filterScatterplotByRole(selectedRole);
        });

        document.getElementById("reset-filter").addEventListener("click", function() {
          console.log("Resetting Scatterplot");
        
          // Ripristina lo scatterplot con tutti i dati originali
          createScatterplot(window.dataset, "scatterplot-container"); // Assicurati che `window.dataset` contenga i dati originali
        });
        

      
  }).catch(error => {
      console.error("Error loading CSV:", error);
  });
});
