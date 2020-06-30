const admin = require('firebase-admin');

var serviceAccount = require("../andrews-admin.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://andrews-admin.firebaseio.com"
});

const db = admin.firestore();

(async () => {
    try {

        // Get all users of the database
        const users = await db.collection('/users').listDocuments();
        const members = [];
        for (let i = 0; i < users.length; i++) {
            members[i] = (await users[i].get()).data().uid;
        }

        // create a new 'techs' group
        // const group = await db.collection('/groups').add({
        //     'abbreviation': 'TC',
        //     'color': 'fcba03',
        //     'name': 'tech',
        //     'members': members
        // });
       const group = await db.collection('/groups').get('WDegTsK7EpXwBpZX8hU4');
        
        // add all users to the 'dev' group
        for (let i = 0; i < users.length; i++) {
            const joinedGroups = (await users[i].get()).data().joinedGroups;
            joinedGroups.push(group.id);
            users[i].update({
                'joinedGroups' : joinedGroups
            });
        }

        // create a tech channel
        db.collection('/groups')
            .doc(group.id)
            .collection('/channels')
            .add({
                'name': "tech",
                'type': "TOPIC",
                'visibility': "OPEN"
            })

        console.log(`Group with id ${group.id} created`);

    } catch (e) {
        console.log(e);
    }
})();
