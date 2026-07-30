import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';



const csvPath = path.join(process.cwd(), 'data', 'fake_job_postings.csv');
const outputPath = path.join(process.cwd(), 'data', 'jobs.json');

// Mapear os níveis de texto do Kaggle para anos de experiência numéricos
const experienceMapping = {
    'Internship': 0,
    'Entry level': 1,
    'Associate': 3,
    'Mid-Senior level': 5,
    'Director': 8,
    'Executive': 10,
    'Not Applicable': 1
};

const techJobs = [];

// Palavras-chave para filtrar vagas de tecnologia
const techKeywords = ['developer', 'engineer', 'programmer', 'software', 'web', 'mobile', 'frontend', 'backend', 'react', 'node', 'flutter'];

console.log("Iniciando leitura e processamento do CSV do Kaggle...");

fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (row) => {
        const titleLower = row.title.toLowerCase();

        // 1. Filtrar: só queremos vagas que tenham palavras de tecnologia no título
        const isTech = techKeywords.some(keyword => titleLower.includes(keyword));
        if (!isTech) return;

        // 2. Mapear Experiência
        const expText = row.required_experience || 'Not Applicable';
        const experienceYears = experienceMapping[expText] !== undefined ? experienceMapping[expText] : 1;

        // 3. Mapear Salário (Se estiver vazio no CSV, estimamos baseado na experiência)
        let salary = 6000;
        if (row.salary_range) {
            // Tenta extrair o primeiro número do range "10000-20000"
            const parts = row.salary_range.split('-');
            const parsed = parseInt(parts[0]);
            if (!isNaN(parsed) && parsed > 0) {
                // Ajusta valores anuais americanos para salários mensais realistas em Reais
                salary = parsed > 20000 ? Math.round(parsed / 12) : parsed;
            }
        } else {
            // Estimativa padrão se não houver salário informado
            salary = 3000 + (experienceYears * 1500) + Math.round(Math.random() * 1000);
        }

        // Limita o salário na nossa escala de R$ 2.000 a R$ 20.000
        salary = Math.min(Math.max(salary, 2000), 20000);

        // 4. Mapear Modelo de Trabalho (Presencial/Híbrido/Remoto)
        let remote = "Presencial";
        if (row.telecommuting === '1') {
            remote = "Remoto";
        } else {
            // Distribuição aleatória didática se telecommuting for 0
            const rand = Math.random();
            remote = rand > 0.6 ? "Híbrido" : "Presencial";
        }

        // 5. Mapear Skills (Procuramos termos na descrição e requisitos)
        const fullText = (row.description + ' ' + row.requirements).toLowerCase();
        const skills = [];
        if (fullText.includes('react') || fullText.includes('angular') || fullText.includes('vue')) skills.push("React");
        if (fullText.includes('css') || fullText.includes('html') || fullText.includes('sass')) skills.push("CSS");
        if (fullText.includes('javascript') || fullText.includes('js') || fullText.includes('ts')) skills.push("Javascript");
        if (fullText.includes('node') || fullText.includes('express') || fullText.includes('nest')) skills.push("Node.js");
        if (fullText.includes('postgre') || fullText.includes('sql') || fullText.includes('mongo')) skills.push("PostgreSQL");
        if (fullText.includes('flutter') || fullText.includes('dart') || fullText.includes('mobile')) skills.push("Flutter");

        // Garante que a vaga tenha pelo menos 1 skill detectada para não estragar o vetor
        if (skills.length === 0) {
            skills.push("Javascript");
        }

        // 6. Montar o objeto limpo da vaga
        techJobs.push({
            id: `job_${row.job_id || Math.random().toString(36).substr(2, 9)}`,
            title: row.title,
            company: row.company_profile ? row.company_profile.split('.')[0] : "Empresa de Tecnologia",
            salary: salary,
            experience_years: experienceYears,
            remote: remote,
            skills: skills,
            description: row.description ? row.description.substring(0, 250) + "..." : "Descrição não disponível."
        });
    })
    .on('end', () => {
        // Pegar apenas as primeiras 100 vagas processadas
        const limitedJobs = techJobs.slice(0, 100);

        // Escrever o arquivo final em data/jobs.json
        fs.writeFileSync(outputPath, JSON.stringify(limitedJobs, null, 4), 'utf8');
        console.log(`Processamento concluído! Mapeadas ${limitedJobs.length} vagas de tecnologia com sucesso em data/jobs.json.`);
    });
