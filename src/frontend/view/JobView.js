export class JobView {
    constructor() {
        this.tableBody = document.getElementById('jobs-table-body');
        this.queryTimeSpan = document.getElementById('query-time');
    }

    // Recebe e exibe as recomendações na tabela ordenadas pela Rede Neural
    renderJobRecommendations(recommendations, queryTimeMs) {
        this.tableBody.innerHTML = '';
        this.queryTimeSpan.textContent = `${queryTimeMs}ms`;

        if (!recommendations || recommendations.length === 0) {
            this.renderEmptyState();
            return;
        }

        recommendations.forEach(job => {
            const row = document.createElement('tr');

            // 1. Coluna de Match IA
            const matchTd = document.createElement('td');
            matchTd.innerHTML = `<span class="table-match-badge">${job.score}% Match</span>`;
            row.appendChild(matchTd);

            // 2. Coluna de Título e Empresa
            const titleTd = document.createElement('td');
            titleTd.innerHTML = `
                <div class="table-job-title">${job.title}</div>
                <div class="table-company-name">${job.company}</div>
            `;
            row.appendChild(titleTd);

            // 3. Coluna de Tecnologias (Skills Tags)
            const skillsTd = document.createElement('td');
            skillsTd.className = 'skills-column';
            job.skills.forEach(skill => {
                const tag = document.createElement('span');
                tag.className = 'tag tech';
                tag.textContent = skill;
                skillsTd.appendChild(tag);
            });
            row.appendChild(skillsTd);

            // 4. Coluna de Salário
            const salaryTd = document.createElement('td');
            salaryTd.textContent = `R$ ${job.salary.toLocaleString('pt-BR')}`;
            row.appendChild(salaryTd);

            // 5. Coluna de Experiência e Modelo
            const expTd = document.createElement('td');
            expTd.innerHTML = `
                <div>${job.experience_years} ano(s) exp.</div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${job.remote}</div>
            `;
            row.appendChild(expTd);

            this.tableBody.appendChild(row);
        });
    }

    // Exibe placeholder quando não há vagas compatíveis
    renderEmptyState() {
        this.tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="table-placeholder">
                    <i class="fa-solid fa-circle-xmark"></i>
                    <h3>Nenhuma Vaga Compatível</h3>
                    <p>Não encontramos vagas correspondentes no ChromaDB.</p>
                </td>
            </tr>
        `;
    }

    // Exibe placeholder de carregamento/espera
    renderInitialState() {
        this.tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="table-placeholder">
                    <i class="fa-solid fa-user-check"></i>
                    <h3>Pronto para Pesquisa</h3>
                    <p>Selecione um candidato na barra lateral para calcular a afinidade com a Rede Neural.</p>
                </td>
            </tr>
        `;
    }

    // Exibe toast ou log de sucesso ao resetar o banco
    showResetSuccess() {
        alert("Banco de dados vetorial do ChromaDB reinicializado com sucesso!");
    }
}
