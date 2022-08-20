const express = require("express");
const path = require("path");
const app = express();
const port = 3000;

const fs = require("fs");

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

// local storage personal json
const JsonStorage = (function () {
    const FilesBuffer = JSON.parse(fs.readFileSync(`storage/FILES.json`));
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
        return JSON.parse(fs.readFileSync(`storage/${id}.json`));
    }

    // const _Files = {
    //     remove: (id, filename) => {
    //         const entry = get(id);
    //         const updatedData = entry.data.filter(
    //             (elem) => elem.filename !== filename
    //         );
    //         const updatedEntry = {
    //             ...entry,
    //             data: updatedData,
    //         };

    //         // rewrite file content
    //         store(id, updatedEntry);
    //     },
    //     exists: (id, filename) => {
    //         return (
    //             get(id).data.find((elem, idx) => elem.filename === filename) !==
    //             undefined
    //         );
    //     },
    //     get: (id, filename) =>
    //         get(id).data.find((el) => el.filename === filename),
    // };

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
        }
    };

    return {
        store: store,
        remove: remove,
        get: get,

        Files: Files,
        Receivers: Receivers,
        Inbox: Inbox,
    };
})();

function successMsg(msg) {
    return { success: true, message: msg };
}

app.get("/home", (req, res) => {
    res.sendFile(path.join(__dirname, "public/home.html"));
});

app.get("/data", (req, res) => {
    const ownerId = "MYKYTA_PAROVYI";
    const entryExists = fs.existsSync(`storage/${ownerId}.json`);
    let entry = JsonStorage.get(ownerId);

    // update inbox if some file was removed / sent 

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

    // const trueInbox = entry.inbox
    //     .map(({ owner, filename, checked }) =>
    //         JsonStorage.get(owner)
    //             .data.filter((ownerFile) => ownerFile.filename === filename)
    //             .map((_) => {
    //                 return {
    //                     ..._,
    //                     owner,
    //                     checked,
    //                 };
    //             })
    //     )
    //     .flat();

    const userFiles = JsonStorage.Files.get(ownerId).filter(({deleted}) => !deleted);

    if (!entryExists) res.json([]);
    else res.json({ ...entry, inbox: trueInbox, data: userFiles });
});

app.get("/people", (req, res) => {
    const peopleArr = fs.readdirSync("storage").map((_) => _.split(".")[0]);

    res.json(peopleArr);
});

app.post("/upload", upload.single("timesheet"), function (req, res) {
    // curr user info
    // uploaded file info
    const { filename, originalname } = req.file;
    const timestamp = getTimestamptStr();

    // save to storage info about whose file is for whoom
    const ownerId = "MYKYTA_PAROVYI";

    // const entry = fs.existsSync(`storage/${id}.json`) && JsonStorage.get(id);
    // let updatedEntry = {
    //     data: [{ filename, originalname, timestamp }],
    //     receivers: [],
    // };
    // if exists already
    // if (entry) {
    //     updatedEntry = {
    //         ...entry,
    //         data: [...entry.data, { filename, originalname, timestamp }],
    //     };
    // }
    // // save
    // JsonStorage.store(id, updatedEntry);
    // return all files

    // add
    JsonStorage.Files.add(filename, ownerId, { originalname, timestamp });

    // return
    res.json(JsonStorage.Files.get(ownerId));
});

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

app.post("/remove/receiver", (req, res) => {
    const receiverIdx = req.body.receiverIdx;
    const id = "MYKYTA_PAROVYI";

    JsonStorage.Receivers.remove(id, receiverIdx);

    res.json(successMsg("Successfuly Removed Receiver."));
});

app.post("/add/receiver", (req, res) => {
    const id = "MYKYTA_PAROVYI";
    const { email } = req.body;

    JsonStorage.Receivers.add(id, { email });

    res.json(successMsg("Successfully Added Receiver!"));
});

app.post("/check/timesheet", (req, res) => {
    const id = "MYKYTA_PAROVYI";

    const { fileId } = req.body;

    JsonStorage.Inbox.check(id, fileId);

    res.json(successMsg("Successfully marked timesheet!"));
});

app.post("/download", async (req, res) => {
    // TODO: check ownership of file
    // TODO: check existance
    const ownerId = "MYKYTA_PAROVYI";
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
