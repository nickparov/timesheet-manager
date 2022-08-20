// function sendFile() {
//     const file = document.getElementById("fileInput");
//     const filePresent = file.files[0] !== undefined;

//     if(!filePresent) {
//         alert("No file attached.");
//         return;
//     }

//     const formData = new FormData();

//     formData.append("timesheet", file.files[0]);

//     fetch("/upload", {
//         method: "POST",
//         body: formData,
//     })
//         .then((res) => res.json())
//         .then((res) => console.log(res))
//         .catch((err) => console.log(err));
// }

// document.getElementById("submitBtn").addEventListener("click", (e) => {
//     sendFile();
// });

const validateEmail = (email) => {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
};

const UTILS = {
    SortFns: {
        date: (a, b) => {
            const fDate = new Date(a.timestamp);
            const sDate = new Date(b.timestamp);

            if (fDate < sDate) {
                return 1;
            } else if (fDate > sDate) {
                return -1;
            } else {
                return 0;
            }
        },
    },
    UI: {
        getElKeyVal: (e, key) => {
            // get filekey
            let val = $(e.target).data(key);
            // get key from the parent element
            if (val === undefined) {
                val = $($(e.target).parent()[0]).data(key);
            }

            return val;
        },
        // main download func
        download: (blob, filename) => {
            // create obj url from blob, set it to newly added a, click, remove a, revokeObjectURL, done...
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        },
        cursorLoads: (flag) => {
            if (flag === true) $("body").css("cursor", "progress");
            else $("body").css("cursor", "default");
        },
    },
};

Dropzone.options.dropzoneMain = {
    // camelized version of the `id`
    paramName: "timesheet", // The name that will be used to transfer the file
    maxFilesize: 2, // MB
    init: function () {
        this.on("success", function (file, res) {
            UI.reload();

            Toast.fire({
                icon: "success",
                title: "Uploaded file successfully!",
            });
        });
        // this.on("addedfile", function(file) {
        //   file.previewElement.addEventListener("click", function() {
        //     // Dropzone.removeFile(file);
        //     console.log(Dropzone)
        //   });
        // });
    },
};

function getElemData(e, dataKey) {
    let data = $(e.target).data(dataKey);

    // get key from the parent element
    if (data === undefined) {
        data = $($(e.target).parent()[0]).data(dataKey);
    } else {
        data = null;
    }

    return data;
}

const UI = {
    buffer: {
        inbox: [],
        sort: null,
    },
    data: [],
    paginated: false,
    currrentPaginationIdx: null,
    appendTimesheet: (fileData) => {
        $("#history").append(
            `<div class="history-text d-flex justify-content-between align-items-center border-bottom-default">
                <span class="pt-1">
                    <span style="font-size: 14px; font-weight: bold;">${fileData.timestamp}</span>
                    <span class="ps-3">${fileData.originalname}</span>
                </span>
                <div class="dropdown me-4">
                    <button class="btn btn-outline-dark" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="bi bi-three-dots"></i>
                    </button>
                    <ul class="dropdown-menu p-3">
                        <li class="mt-1"><button data-filekey="${fileData.fileId}" class="btn btn-outline-dark w-100 downloadBtn">
                            Download <i class="bi bi-file-arrow-down"></i>
                        </button></li>
                        <li class="mt-1"><button class="btn btn-outline-primary w-100">
                            Send <i class="bi bi-envelope"></i>
                        </button></li> 
                        <li class="mt-1"><button data-filekey="${fileData.fileId}" class="btn deleteBtn btn-outline-danger w-100">
                            Delete <i class="bi bi-trash"></i>
                        </button></li>
                    </ul>
                </div>
            </div>`
        );
    },
    appendReceiver: ({ email }, idx) => {
        $("#receivers").append(
            `   <p class="border p-4 template-single">
                    ${email} 
                    <a style="color: red" href="#" class="deleteReceiverBtn" data-receiveridx="${idx}"
                        ><i class="bi bi-trash"></i>
                    </a>
                </p>`
        );
    },
    appendInbox: ({ ownerId, originalname, timestamp, checked, fileId }) => {
        $("#timesheets").append(
            `         <div class="col-lg-3">
                        <div data-filekey="${fileId}" class="timesheet-single ${
                checked ? "checked" : ""
            } 
                        d-flex align-items-center justify-content-center flex-column">
                            <p><i class="bi bi-filetype-pdf" style="font-size: 36px"></i></p>
                            <p> ${originalname}</p>
                            <p> ${ownerId}</p>
                            <p> ${timestamp}</p>
                        </div>
                        <div class="d-grid">
                            <button style="border-radius: 0px" data-filekey="${fileId}" class="downloadBtn btn btn-secondary"><i class="bi bi-file-earmark-arrow-down"></i></button>
                        </div>
                    </div>
                    `
        );
    },
    setNone: () => {
        $("#history").html(
            `<p class="history-text">
          No files yet.
        </p>`
        );
    },
    addPagination: (numOfPages) => {
        $("#pagination")
            .append(`<ul class="pagination justify-content-center mt-2">
        <li class="page-item">
        <a class="page-link" href="#" id="previous-pagination-button" tabindex="-1" aria-disabled="true"><i class="bi bi-arrow-left"></i></a>
        </li>
        ${new Array(numOfPages)
            .fill(0)
            .map(
                (_, idx) =>
                    `<li class="page-item page-item-number" id="page-item-${idx}"><a class="page-link" href="#">${
                        idx + 1
                    }</a></li>`
            )
            .join("")}
        <li class="page-item">
            <a class="page-link" id="next-pagination-button" href="#"><i class="bi bi-arrow-right"></i></a>
        </li>
    </ul>`);
    },
    setCurrentPagination: (idx) => {
        $(`#page-item-${UI.currrentPaginationIdx}`).removeClass("active");
        $(`#page-item-${idx}`).addClass("active");

        UI.currrentPaginationIdx = idx;

        $("#timesheets").html("");

        // readd those needed
        UI.data.inbox.slice(idx * 8, idx * 8 + 8).forEach((el) => {
            UI.appendInbox(el);
        });
    },
    renderInbox: () => {
        $("#timesheets").html("");

        if (UI.paginated)
            UI.paginated && UI.setCurrentPagination(UI.currrentPaginationIdx);
        else
            UI.data.inbox.forEach((el) => {
                UI.appendInbox(el);
            });
    },
    clear: () => {
        $("#history").html("");
        $("#receivers").html("");
        $("#timesheets").html("");
        $("#pagination").html("");
    },
    reload: () => {
        fetch("/data", {
            method: "GET",
        })
            .then((res) => res.json())
            .then((res) => {
                console.log(res);
                // Clear UI
                UI.clear();
                UI.data = res;

                // Show no files yet if no files yet =)
                res.length === 0 && UI.setNone();

                const { data, receivers, inbox } = res;

                // cache init
                UI.buffer.inbox.push([...inbox]);

                // Append one by one
                if (data) {
                    // Sort timesheets by date (newest)
                    const TsByDate = data.sort(UTILS.SortFns.date);
                    // Render
                    for (const ts of TsByDate) {
                        UI.appendTimesheet(ts);
                    }
                }
                if (receivers)
                    for (const [idx, receiver] of receivers.entries())
                        UI.appendReceiver(receiver, idx);

                if (inbox) {
                    let inboxToDisplay =
                        inbox.length > 8 ? inbox.slice(0, 8) : inbox;
                    const shouldPaginate = inbox.length > 8 ? true : false;

                    UI.currrentPaginationIdx = 0;

                    if (shouldPaginate) {
                        if (UI.paginated === false) UI.paginated = true;
                        UI.addPagination(Math.ceil(inbox.length / 8));
                    }

                    for (const [idx, inboxItem] of inboxToDisplay.entries()) {
                        UI.appendInbox(inboxItem, idx);
                    }

                    UI.setCurrentPagination(UI.currrentPaginationIdx);
                }
            })
            .catch((err) => {
                console.error(err);
            });
    },
    setup: () => {
        // DELETE FILE btn listener
        $("body").on("click", ".deleteBtn", function (e) {
            // get filekey
            let filekey = $(e.target).data("filekey");
            // get key from the parent element
            if (filekey === undefined) {
                filekey = $($(e.target).parent()[0]).data("filekey");
            }

            fetch("/remove/file", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ filekey: filekey }),
            })
                .then((res) => res.json())
                .then((res) => {
                    console.log(res);
                    // clear files preview in dropzone
                    Dropzone.forElement("#dropzone-main").removeAllFiles();

                    // Show toast
                    if (res.success)
                        Toast.fire({
                            icon: "success",
                            title: "Removed file successfully!",
                        });
                    // fully reload UI
                    UI.reload();
                })
                .catch((err) => {
                    console.error(err);
                });
        });

        // DOWNLOAD ts btn listener
        $("body").on("click", ".downloadBtn", function (e) {
            e.preventDefault();

            const fileId = UTILS.UI.getElKeyVal(e, "filekey");

            // req ts endpoint for dowloading the file
            fetch("/download", {
                method: "POST",
                headers: {
                    Accept: "*",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    fileId: fileId,
                }),
                responseType: "blob",
            })
                .then((response) => {
                    return response.blob();
                })
                .then((myBlob) => UTILS.UI.download(myBlob, "timesheet.pdf"));
        });

        // RESET file zone listener
        $("body").on("click", "#resetBtn", function (e) {
            Dropzone.forElement("#dropzone-main").removeAllFiles();
        });

        // Receivers
        $("body").on("click", ".deleteReceiverBtn", function (e) {
            let recIdx = getElemData(e, "receiveridx");

            fetch("/remove/receiver", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ receiverIdx: recIdx }),
            })
                .then((res) => res.json())
                .then((res) => {
                    console.log(res);
                    // fully reload UI
                    UI.reload();

                    if (res.success)
                        Toast.fire({
                            icon: "success",
                            title: "Removed email successfully!",
                        });
                })
                .catch((err) => {
                    console.error(err);
                });
        });
        $("body").on("click", ".addReceiverBtn", async function (e) {
            const { value: email } = await Swal.fire({
                title: "Email address",
                input: "text",
                inputPlaceholder: "Enter email address",
                showCancelButton: true,
                inputValidator: (value) => {
                    return new Promise((resolve) => {
                        if (validateEmail(value)) {
                            resolve();
                        } else {
                            resolve("You need to input valid email.");
                        }
                    });
                },
                confirmButtonText: "Add",
            });

            if (email && validateEmail(email)) {
                fetch("/add/receiver", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email: email }),
                })
                    .then((res) => res.json())
                    .then((res) => {
                        console.log(res);
                        if (res.success) {
                            Toast.fire({
                                icon: "success",
                                title: "Added new email successfully!",
                            });
                        }
                        // fully reload UI
                        UI.reload();
                    })
                    .catch((err) => {
                        console.error(err);
                    });
            }
        });

        // Pagination
        $("body").on("click", ".page-item.page-item-number", (e) => {
            e.preventDefault();

            const clickedIdx = parseInt($(e.target).text()) - 1;

            if (clickedIdx === UI.currrentPaginationIdx) return;

            UI.setCurrentPagination(clickedIdx);
        });

        $("body").on("click", "#previous-pagination-button", (e) => {
            e.preventDefault();

            if (UI.currrentPaginationIdx !== 0)
                UI.setCurrentPagination(UI.currrentPaginationIdx - 1);
        });

        $("body").on("click", "#next-pagination-button", (e) => {
            e.preventDefault();

            if (
                UI.currrentPaginationIdx !==
                Math.ceil(UI.data.inbox.length / 8) - 1
            )
                UI.setCurrentPagination(UI.currrentPaginationIdx + 1);
        });

        // Timesheets Handlers
        $("body").on("click", ".timesheet-single", (e) => {
            const filekey = $(e.target).data("filekey");

            const successHandler = () => {
                $(e.target).toggleClass("checked");
                UTILS.UI.cursorLoads(false);
                UI.reload();
            };

            const errorHandler = (err) => {
                Toast.fire({
                    icon: "error",
                    title: `Some error occured during timesheet marking. Message: ${err}`,
                });
            };

            // Initial cursor loading
            UTILS.UI.cursorLoads(true);

            fetch("/check/timesheet", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ fileId: filekey }),
            })
                .then((res) => res.json())
                .then((res) => {
                    if (res.success) successHandler();
                })
                .catch((err) => errorHandler(err));
        });

        // Sorting / Searching
        $("body").on("click", ".sort-option", (e) => {
            e.preventDefault();

            const execSort = {
                checked: () => {
                    let sorted = [];
                    let idxToIgnore = [];

                    // first push all checked all
                    UI.data.inbox.forEach((elem, idx) => {
                        elem.checked &&
                            sorted.push(elem) &&
                            idxToIgnore.push(idx);
                    });

                    // push all other elems
                    UI.data.inbox.forEach((elem, idx) => {
                        idxToIgnore.includes(idx) === false &&
                            sorted.push(elem);
                    });

                    // alter original
                    UI.data.inbox = sorted;
                },
                name: () => {
                    function compare(a, b) {
                        // Use toUpperCase() to ignore character casing
                        const nameA = a.ownerId.toUpperCase();
                        const nameB = b.ownerId.toUpperCase();

                        let comparison = 0;
                        if (nameA > nameB) {
                            comparison = 1;
                        } else if (nameA < nameB) {
                            comparison = -1;
                        }
                        return comparison;
                    }

                    UI.data.inbox.sort(compare);
                },
                submissiondate: () => {
                    UI.data.inbox.sort(UTILS.SortFns.date);
                },
                none: () => {
                    UI.data.inbox = UI.buffer.inbox[0];
                },
            };

            // get sort identifier
            const sortBy = $(e.target).text().trim();
            // call needed sort action
            execSort[sortBy.toLowerCase().replace(/\s/g, "")].call();
            // rerender Inbox
            UI.renderInbox();
        });

        let prevSearchkeyLength = 0;

        $("body").on("input", "#searhBar", (e) => {
            const searchKey = $(e.target).val().toLowerCase();

            if (searchKey === "") {
                UI.buffer.inbox = [[...UI.buffer.inbox[0]]];
                UI.data.inbox = UI.buffer.inbox[0];
                prevSearchkeyLength = 0;
            }

            // update buffer
            // if (UI.buffer.inbox !== null) {
            //     UI.buffer.inbox = [...UI.data.inbox];
            // }

            // buffer search results logic
            if (prevSearchkeyLength < searchKey.length) {
                // filter out
                UI.data.inbox = UI.data.inbox.filter((elem) => {
                    return (
                        elem.ownerId.toLowerCase().includes(searchKey) ||
                        elem.originalname.toLowerCase().includes(searchKey) ||
                        elem.timestamp.toLowerCase().includes(searchKey)
                    );
                });
                // push to buffer results
                UI.buffer.inbox.push([...UI.data.inbox]);
            } else if (prevSearchkeyLength > searchKey.length) {
                UI.data.inbox = UI.buffer.inbox.pop();
            }

            prevSearchkeyLength = searchKey.length;

            console.log(UI.data.inbox);

            UI.renderInbox();
        });
    },
};

// Intial call
UI.reload();

// setup UI
UI.setup();

// setup Toasts
var Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: false,
    didOpen: (toast) => {
        toast.addEventListener("mouseenter", Swal.stopTimer);
        toast.addEventListener("mouseleave", Swal.resumeTimer);
    },
});

/// eleeese
const daysInMonth = (y, m) => new Date(y, m, 0).getDate();
const getCurrentPayperiod = (name = null) => {
    let dateObj = new Date(),
        month = dateObj.getUTCMonth() + 1, //months from 1-12
        day = dateObj.getUTCDate() + 1;

    const maxDaysInPrevMonth = daysInMonth(dateObj.getFullYear(), month - 1);
    const payPeriod = 13;
    // calc date
    let startDay = day - payPeriod;
    let startMonth = month;

    // startDay is either positive, 0, or negative
    // adjust day
    if (startDay > 0) {
        // nothing
    } else if (startDay == 0) {
        // set startDay to the last dayu of the prev month
        startDay = maxDaysInPrevMonth;
        startMonth -= 1;
    } else {
        startDay = maxDaysInPrevMonth + startDay;
        startMonth -= 1;
    }
    // adjust month
    if (startMonth == 0) {
        startMonth = 12;
    }
    // Formatting
    startDay = startDay > 9 ? startDay : `0${startDay}`;
    startMonth = startMonth > 9 ? startMonth : `0${startMonth}`;

    day = day > 9 ? day : `0${day}`;
    month = month > 9 ? month : `0${month}`;

    return `${startMonth}/${startDay} - ${month}/${day}`;
};
