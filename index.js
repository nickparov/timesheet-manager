const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const port = 3000;

// Firebase
var admin = require("firebase-admin");

var serviceAccount = require("./keys/timesheet-manager-ad983-firebase-adminsdk-selhn-b8aedd0b6c.json");

const adminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();

// File stuff config
const multer = require("multer");
const upload = multer({ dest: "uploads" });

app.use(express.json());

function getTimestamptStr() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
    const yyyy = today.getFullYear();

    return mm + "/" + dd + "/" + yyyy;
}

async function checkToken(req, res, next) {
    try {
        const TOKEN = req.headers.idtoken;
        // console.log("TOKEN", TOKEN)

        if (!TOKEN) {
            res.status(404).send({ message: "Not Found!" });
            return;
        }

        // verify token in firebase
        req.uData = await verifyToken(TOKEN);

        // proceed
        next();
        return;
    } catch (error) {
        console.error(error);
        res.status(500).send({
            message: "Server error occured, try again later.",
        });
        return;
    }
}

async function verifyToken(token) {
    return new Promise(async (resolve, reject) => {
        try {
            // verify token in firebase
            const uData = await auth.verifyIdToken(token);

            resolve(uData);
        } catch (error) {
            reject(error);
        }
    });
}

// local storage personal json
const JsonStorage = (function () {
    const FilesBuffer = JSON.parse(fs.readFileSync(`storage/FILES.json`));
    const MappingsBuffer = JSON.parse(fs.readFileSync(`storage/MAPPING.json`));

    let dataChanged = false;

    const Files = {
        remove(fileId) {
            this.markDataChanged(true);

            // mark as deleted
            FilesBuffer[fileId].deleted = true;

            // unlink in def queue
            fs.unlink(`uploads/${fileId}`, (err) => {
                if (err) {
                    console.error(err);
                    return;
                }
            });
        },
        add(filename, ownerId, dataObj) {
            this.markDataChanged(true);

            FilesBuffer[filename] = { ...dataObj, ownerId };
        },
        exists(fileId) {
            return !!FilesBuffer[fileId];
        },
        get(ownerId) {
            return Object.entries(FilesBuffer)
                .filter(([fileId, fileData]) => {
                    return fileData["ownerId"] === ownerId;
                })
                .map(([_first, _second]) => {
                    return {
                        ..._second,
                        fileId: _first,
                    };
                });
        },
        getOne(fileId) {
            return FilesBuffer[fileId];
        },
        getBufferData() {
            return FilesBuffer;
        },
        markDataChanged(bool) {
            dataChanged = bool;
        },
        wasDataChanged() {
            return dataChanged;
        },
    };

    function store(id, data) {
        fs.writeFileSync(`storage/${id}.json`, JSON.stringify(data));
    }

    function remove(id) {}

    function get(id) {
        try {
            return JSON.parse(fs.readFileSync(`storage/${id}.json`));
        } catch (error) {
            throw error;
        }
    }

    const Receivers = {
        remove: (id, receiverIdx) => {
            const entry = get(id);
            const updatedReceivers = entry.receivers.filter(
                (elem, idx) => idx !== receiverIdx
            );

            const updatedEntry = {
                ...entry,
                receivers: updatedReceivers,
            };

            store(id, updatedEntry);
        },
        add: (id, { email, subject }) => {
            const entry = get(id);
            const updatedReceivers = entry.receivers.concat([
                { email, subject },
            ]);

            const updatedEntry = {
                ...entry,
                receivers: updatedReceivers,
            };

            store(id, updatedEntry);
        },
    };

    const Inbox = {
        check: (id, fileId) => {
            const entry = get(id);

            let updatedInbox = { ...entry.inbox };
            updatedInbox[fileId].checked = !updatedInbox[fileId].checked;

            const updatedEntry = {
                ...entry,
                inbox: updatedInbox,
            };

            store(id, updatedEntry);
        },
        append: (uid, fileId) => {
            //  case 1: new file was sent by someone.
            //  "d3227232f366204a7107abe05abb95aa": { "checked": true }
            const userEntry = get(uid);

            const oldInbox = { ...userEntry.inbox };
            const updatedInbox = { ...oldInbox, [fileId]: { checked: false } };

            const updatedEntry = {
                ...userEntry,
                inbox: updatedInbox
            }


            // store updated entry.
            store(uid, updatedEntry);
        },
    };

    const Mappings = {
        all() {
            return MappingsBuffer;
        }
    }

    return {
        store: store,
        remove: remove,
        get: get,

        Files: Files,
        Receivers: Receivers,
        Inbox: Inbox,
        Mappings: Mappings
    };
})();

function successMsg(msg) {
    return { success: true, message: msg };
}

app.get("/data", checkToken, async (req, res) => {
    const { email, uid } = req.uData;

    console.log(uid);

    const entryExists = fs.existsSync(`storage/${uid}.json`);

    // if no file exist on user.
    if (!entryExists) {
        // res.status(400).json({err: "No such entry!"});

        // register
        // Create new data entry in json db.
        JsonStorage.store(uid, {
            receivers: [],
            inbox: {},
            email: email
        });
    }

    let entry = JsonStorage.get(uid);
    // update inbox if some file was removed / sent.
    const trueInbox = Object.entries(entry.inbox).map(
        ([fileId, { checked }]) => {
            const fileData = JsonStorage.Files.getOne(fileId);

            return {
                ...fileData,
                checked,
                fileId,
            };
        }
    );

    // get user files not deleted.
    const userFiles = JsonStorage.Files.get(uid).filter(
        ({ deleted }) => !deleted
    );

    res.json({ ...entry, inbox: trueInbox, data: userFiles });
});

// app.get("/login", (req, res) => {
//     res.sendFile(path.resolve(__dirname, "public/Login.html"));
// });

app.get("/dashboard", (req, res) => {
    res.sendFile(path.resolve(__dirname, "public/Dashboard.html"));
});

app.get("/people", (req, res) => {
    const peopleArr = fs.readdirSync("storage").map((_) => _.split(".")[0]);

    res.json(peopleArr);
});

app.post("/upload", upload.single("timesheet"), async function (req, res) {
    // req.file is the name of your file in the form above, here 'uploaded_file'
    // req.body will hold the text fields, if there were any
    let uData = null;

    // do token checks
    try {
        uData = await verifyToken(req.body.idtoken);
    } catch (error) {
        res.status(401).json({ message: "Auth failed!" });
        return;
    }

    // proceed
    const { filename, originalname } = req.file;
    const timestamp = getTimestamptStr();

    // save to storage info about whose file is for whoom
    const ownerId = uData.uid;

    // add
    JsonStorage.Files.add(filename, ownerId, {
        originalname,
        timestamp,
        deleted: false,
    });

    // return file data
    res.json(JsonStorage.Files.get(ownerId));
});
/*
app.post("/upload", upload.single("timesheet"),  function (req, res) {
    console.log(req.body);
    // curr user info
    // uploaded file info
    const { filename, originalname } = req.file;
    const timestamp = getTimestamptStr();

    // save to storage info about whose file is for whoom
    const ownerId = req.uData.uid;

    // add
    JsonStorage.Files.add(filename, ownerId, {
        originalname,
        timestamp,
        deleted: false,
    });

    // return
    res.json(JsonStorage.Files.get(ownerId));
});
*/

app.post("/remove/file", (req, res) => {
    const filename = req.body.filekey;
    const ownerId = "MYKYTA_PAROVYI";

    // check user entry to contain that file
    const fileExistsOnUser = JsonStorage.Files.exists(filename);

    if (!fileExistsOnUser) {
        res.status(404).json({ message: "File entry not found on this user!" });
        return;
    }

    // remove from entry
    JsonStorage.Files.remove(filename);

    res.json(successMsg("Successfuly Removed File."));
});

app.post("/send/file", checkToken, (req, res) => {
    const fileId = req.body.fileId;
    const ownerId = req.uData.uid;
    const receiverEmail = req.body.email;

    

    // check user entry to contain that file
    // TODO polish
    const fileExistsOnUser = JsonStorage.Files.exists(fileId);

    if (!fileExistsOnUser) {
        res.status(404).json({ message: "File entry not found on this user!" });
        return;
    }
    
    const mappings = JsonStorage.Mappings.all();
    const receiverUid = mappings[receiverEmail];

    // add to inbox of receiver user
    JsonStorage.Inbox.append(receiverUid, fileId);

    res.json(successMsg("Successfuly sent timesheet to person."));
});

app.post("/remove/receiver", checkToken, (req, res) => {
    const receiverIdx = req.body.receiverIdx;
    console.log(req.uData);
    const id = req.uData.uid;

    JsonStorage.Receivers.remove(id, receiverIdx);

    res.json(successMsg("Successfuly Removed Receiver."));
});

app.post("/add/receiver", checkToken, (req, res) => {
    const id = req.uData.uid;
    const { email } = req.body;

    JsonStorage.Receivers.add(id, { email });

    res.json(successMsg("Successfully Added Receiver!"));
});

app.post("/check/timesheet", checkToken, (req, res) => {
    const ownerId = req.uData.uid;

    const { fileId } = req.body;

    JsonStorage.Inbox.check(ownerId, fileId);

    res.json(successMsg("Successfully marked timesheet!"));
});

app.post("/download", checkToken, async (req, res) => {
    // TODO: check ownership of file
    // TODO: check existance
    const ownerId = req.uData.uid;
    const fileId = req.body.fileId;

    // get from storage
    const fileData = JsonStorage.Files.getOne(fileId);

    console.log(fileData);
    const filePath = path.join(__dirname, `uploads/${fileId}`);

    if (fileData === undefined) {
        res.status(404).send("Error while searching for the file.");
    } else {
        res.download(filePath, fileData.originalname);
    }
});

app.use(express.static("public"));

function saveFilesSnapshot() {
    JsonStorage.store("FILES", JsonStorage.Files.getBufferData());
    JsonStorage.Files.markDataChanged(false);
}

setInterval(function () {
    // save files to db
    JsonStorage.Files.wasDataChanged() === true && saveFilesSnapshot();
}, 10000);

app.listen(port, () => {
    // check for people storage
    console.log(`App listening on port ${port}`);
});
