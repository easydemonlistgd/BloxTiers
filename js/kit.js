function loadKit(kitId) {

    const kit = kits[kitId];
    const container = document.getElementById("ranking");

    if (!kit) {
        container.innerHTML = "<p>Kit not found.</p>";
        return;
    }

    const players = [...kit.players].sort((a, b) => b.points - a.points);

    let html = `
        <div class="ranking-table">

            <div class="table-head">
                <div>#</div>
                <div>PLAYER</div>
                <div>POINTS</div>
            </div>
    `;

    players.forEach((player, index) => {

        const position = index + 1;

        html += `
            <div class="player-row">

                <div class="rank">
                    ${position}
                </div>

                <div class="player">
                    <div class="avatar">
                        ${player.name.charAt(0).toUpperCase()}
                    </div>

                    <span>${player.name}</span>
                </div>

                <div class="points">
                    ${player.points.toLocaleString()}
                </div>

            </div>
        `;
    });

    html += `</div>`;

    container.innerHTML = html;
}