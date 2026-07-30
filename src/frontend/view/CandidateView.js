import Events from '../events/events.js';

export class CandidateView {
    constructor() {
        this.selectElement = document.getElementById('candidate-select');
        this.profileContainer = document.getElementById('candidate-profile');

        // Elementos internos do card do perfil do candidato ativo
        this.expText = document.getElementById('cand-exp');
        this.salaryText = document.getElementById('cand-salary');
        this.remoteText = document.getElementById('cand-remote');
        this.skillsContainer = document.getElementById('cand-skills');
        this.bioText = document.getElementById('cand-bio');
        this.vectorText = document.getElementById('cand-vector');

        this.setupListeners();
    }

    setupListeners() {
        // Escutar quando o usuário selecionar um candidato no menu
        this.selectElement.addEventListener('change', (e) => {
            const candidateId = e.target.value;
            // Avisar o sistema que um candidato foi selecionado
            Events.dispatchCandidateSelected(candidateId);
        });
    }

    // Preenche o combo-box (<select>) com a lista de candidatos cadastrados
    renderCandidatesList(candidates) {
        this.selectElement.innerHTML = `<option value="" disabled selected>Escolha um candidato...</option>`;
        candidates.forEach(cand => {
            const option = document.createElement('option');
            option.value = cand.id;
            option.textContent = cand.name;
            this.selectElement.appendChild(option);
        });
    }

    // Atualiza a tela exibindo os dados do candidato ativo e o seu vetor correspondente do ChromaDB
    renderActiveCandidate(candidate, vector) {
        // Tornar o card de perfil visível
        this.profileContainer.style.display = 'flex';

        // Atualizar textos básicos
        this.expText.textContent = `${candidate.experience_years} ano(s)`;
        this.salaryText.textContent = `R$ ${candidate.target_salary.toLocaleString('pt-BR')}`;

        // Tag de trabalho remoto/presencial
        this.remoteText.textContent = candidate.remote_pref;
        this.remoteText.className = `tag remote ${candidate.remote_pref.toLowerCase()}`;

        // Tags de habilidades técnicas
        this.skillsContainer.innerHTML = '';
        candidate.skills.forEach(skill => {
            const tag = document.createElement('span');
            tag.className = 'tag tech';
            tag.textContent = skill;
            this.skillsContainer.appendChild(tag);
        });

        this.bioText.textContent = candidate.bio;

        // Renderizar o vetor 6D no display (ex: [0.10, 0.25, 1.00, 0.00, 0.00, 1.00])
        if (vector) {
            const formattedVector = `[${vector.map(v => v.toFixed(2)).join(', ')}]`;
            this.vectorText.textContent = formattedVector;
        }
    }
}
