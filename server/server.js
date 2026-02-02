const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());

app.get('/:userId', (req, res) => {
    try {
        const userId = req.params.userId;

        const data = fs.readFileSync(path.join(__dirname, '/' + userId + '/database.json'), 'utf8');
        const userModels = JSON.parse(data);
        
        const models = userModels[userId] || [];
        
        console.log(`Richiesta da ${userId}: inviati ${models.length} oggetti.`);
        res.json(models);
    } catch (err) {
        console.error("Errore nella lettura del file database.json:", err);
        res.status(500).json({ error: "Errore interno del server" });
    }
});

app.listen(3000, () => console.log('Server dinamico pronto su porta 3000'));