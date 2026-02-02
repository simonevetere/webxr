export const Factory = {
    create: async (type, params = {}) => {
        try {
            let module;
            try {
                module = await import(`./models/${type}.js`);
            } catch (e) {
                console.error("Errore Factory", e);
                module = await import(`./models/generic.js`);
            }
            
            const obj = await module.create(params);
            
            if (obj) {
                obj.userData.type = type;
                obj.userData.params = params;
            }
            return obj;
        } catch (error) {
            console.error("Errore Factory", error);
            return null;
        }
    }
};