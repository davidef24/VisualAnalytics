document.addEventListener("DOMContentLoaded", function() {
    console.log("D3 script loaded!");

    d3.csv("data/cleaned_players.csv").then(function(data) {
        console.log("CSV Data Loaded:", data);

        // Posizioni aggiornate per la formazione 1-4-3-3
        const positions = [
            { role: "Keeper", x: 50, y: 200 },   // Portiere
            { role: "Centre Back", x: 150, y: 50 },  // Difensore sinistro
            { role: "Centre Back", x: 125, y: 150 }, // Difensore centrale
            { role: "Centre Back", x: 125, y: 250 }, // Difensore centrale
            { role: "Centre Back", x: 150, y: 350 }, // Difensore destro
            { role: "Midfielder", x: 320, y: 110 },  // Centrocampista sinistro
            { role: "Midfielder", x: 260, y: 200 }, // Centrocampista centrale
            { role: "Midfielder", x: 320, y: 290}, // Centrocampista destro
            { role: "Forward", x: 450, y: 75 },    // Attaccante sinistro
            { role: "Forward", x: 475, y: 200 },   // Attaccante centrale
            { role: "Forward", x: 450, y: 325 }    // Attaccante destro
        ];

        const positionColors = {
            "Keeper": "#ffff33",           // Colore per il portiere
            "Centre Back": "#377eb8",       // Colore per il difensore centrale
            "Midfielder": "#ff7f00",      // Colore per il centrocampista
            "Forward": "#e41a1c"         // Colore per l'attaccante
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
        .attr("r", 12)  // Riduci il raggio dei pallini
        .attr("fill", d => positionColors[d.role])  // Cambia il colore in base al ruolo
        .style("cursor", "pointer")
        .on("click", function(event, d) {
            console.log("Clicked position:", d.role);
            filterPlayers(d.role);
        });


        // Testi per i ruoli
        svg.selectAll("text")
            .data(positions)
            .enter()
            .append("text")
            .attr("x", d => d.x)
            .attr("y", d => d.y - 15)  // Aggiungi spazio sopra il pallino
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .attr("font-size", "10px")  // Font size ridotto
            .attr("font-weight", "bold")
            .text(d => d.role);

        function filterPlayers(position) {
            const filtered = data.filter(player => player.position === position);
            console.log("Filtered Players:", filtered);
        }
    }).catch(error => {
        console.error("Error loading CSV:", error);
    });
});
