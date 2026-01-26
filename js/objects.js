export const Factory = {
    create: async (type, params = {}) => {
        try {
            const module = await import(`./models/${type}.js`);
            
            const obj = module.create(params);
            
            obj.userData.type = type;
            obj.userData.params = params;
            
            return obj;
        } catch (error) {
            console.error(`Impossibile caricare il modello: ${type}. Assicurati che il file js/models/${type}.js esista.`, error);
            return null;
        }
    }
};