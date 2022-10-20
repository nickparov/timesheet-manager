import React, { useState, useEffect } from "react";
import CORE from "./core";

const { UTILS, UI } = CORE;

/**
 * <    div class="col-lg-3">
            <div data-filekey="{{fileId}}" data-deletedbyowner="{{deleted.toString()}}" class="timesheet-single {{
    checked ? "checked" : ""
}} d-flex align-items-center justify-content-center flex-column">
                <p><i class="bi bi-filetype-pdf" style="font-size: 36px"></i></p>
                <p> {{originalname}}</p>
                <p> {{ownerId}}</p>
                <p> {{timestamp}}</p>
            </div>
            <div class="d-grid">
                <button style="border-radius: 0px" data-filekey="{{fileId}}" {{
                        deleted === true ? "disabled" : ""
                    }} class="downloadBtn btn btn-secondary"><i class="bi bi-file-earmark-arrow-down"></i> {{
                        deleted === true ? "deleted by owner." : ""
                    }}
                </button>
            </div>
        </div>
 */

const sortTools = {
    performSort(data, sortID) {
        let resArr = structuredClone(data);
        if (sortID !== "checked") {
            resArr.sort(this[sortID]);
        } else {
            // if checked
            const checkedArr = resArr.filter(({ checked }) => checked === true);
            const uncheckedArr = resArr.filter(
                ({ checked }) => checked === false
            );
            resArr = [].concat(checkedArr).concat(uncheckedArr);
        }

        return resArr;
    },
    submissiondate(a, b) {
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
    name(a, b) {
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
    },
    checked(a, b) {
        if (a.checked === b.checked) {
            // tt or ff
            return 0;
        } else if (a.checked !== b.checked) {
            return 1;
        }
    },
};

const TimesheetElement = (props) => {
    const { ownerId, originalname, timestamp, checked, fileId, deleted } =
        props.data;

    const tsClassList = [
        "timesheet-single",
        "d-flex",
        "align-items-center",
        "justify-content-center",
        "flex-column",
    ];

    checked && tsClassList.push("checked");

    function checkTimesheetHandler(e) {
        const filekey = UTILS.UI.getElKeyVal(e, "filekey");

        // string to boolean coercion
        // const wasDeleted = Boolean(
        //     UTILS.UI.getElKeyVal(e, "deletedbyowner")
        // );

        if (filekey === undefined) return;

        const successHandler = () => {
            $(e.target).toggleClass("checked");
            UTILS.UI.cursorLoads(false);
            // TODO do data check on both sides
            // UI.reload();
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
    }

    return (
        <div className="col-lg-3">
            <div
                data-filekey={fileId}
                data-deletedbyowner={deleted.toString()}
                className={tsClassList.join(" ")}
                onClick={checkTimesheetHandler}
            >
                <p>
                    <i
                        className="bi bi-filetype-pdf"
                        style={{ fontSize: "36px" }}
                    ></i>
                </p>
                <p> {originalname}</p>
                <p> {ownerId}</p>
                <p> {timestamp}</p>
            </div>
            <div className="d-grid">
                <button
                    style={{ borderRadius: "0px" }}
                    disabled={deleted === true}
                    data-filekey={fileId}
                    className="downloadBtn btn btn-secondary"
                >
                    <i className="bi bi-file-earmark-arrow-down"></i>
                    {deleted === true ? "deleted by owner." : ""}
                </button>
            </div>
        </div>
    );
};

const PaginationElement = ({ pageNumber, clickHandler, isActive }) => {
    const liClassList = ["page-item", "page-item-number"];
    isActive && liClassList.push("active");

    return (
        <li className={liClassList.join(" ")} id={"page-item-" + pageNumber}>
            <a
                onClick={(e) => clickHandler(e, pageNumber)}
                className={"page-link"}
                href="#"
            >
                {pageNumber}
            </a>
        </li>
    );
};

// Pagination Component
const Pagination = ({
    totalPages,
    navClickHandler,
    navDigitClickHandler,
    currPagPage,
}) => {
    // how many pages
    // curr page
    // next/prev functionality
    // setCurrPageHandler
    const pagesArr = new Array(totalPages).fill(null);

    const pagesToRender = pagesArr.map((_, idx) => (
        <PaginationElement
            clickHandler={navDigitClickHandler}
            pageNumber={idx + 1}
            key={idx}
            isActive={idx === currPagPage}
        />
    ));

    return (
        <div id="pagination">
            <ul className="pagination justify-content-center mt-2">
                <li className="page-item">
                    <a
                        className="page-link"
                        href="#"
                        id="previous-pagination-button"
                        tabIndex="-1"
                        aria-disabled="true"
                        onClick={(e) => navClickHandler(e, false)}
                    >
                        <i className="bi bi-arrow-left"></i>
                    </a>
                </li>
                {pagesToRender}
                <li className="page-item">
                    <a
                        className="page-link"
                        id="next-pagination-button"
                        href="#"
                        onClick={(e) => navClickHandler(e, true)}
                    >
                        <i className="bi bi-arrow-right"></i>
                    </a>
                </li>
            </ul>
        </div>
    );
};

// Container Component
const Timesheet = () => {
    const [tsData, setTsData] = useState([]);
    const [searchKey, setSearchKey] = useState("");
    const [sortFuncID, setSortFuncID] = useState("none");
    const [sortReverted, setSortReverted] = useState(false);
    const [totalPagPages, setTotalPagPages] = useState(0);
    const [currPagPage, setCurrPagPage] = useState(0);

    let toRender = [];
    let toRenderArr = [];

    // Run once
    useEffect(() => {
        // subscribe state change on inbox_data event
        UI.publisher.subscribe(setTsData, "inbox_data");
    }, []);

    useEffect(() => {
        // recalculate totalPagPages
        let newTotalPagPages =
            tsData.length > 8 ? Math.ceil(tsData.length / 8) : 0;
        setTotalPagPages(newTotalPagPages);
        setCurrPagPage(0);
    }, [tsData]);

    useEffect(() => {
        console.log(currPagPage);
    }, [currPagPage]);

    function searchBarKeywordHandler(e) {
        const searchKey = $(e.target).val().toLowerCase();
        setSearchKey(searchKey);
    }

    function navClickHandler(e, isNext) {
        e.preventDefault();
        // next is clicked
        if (isNext) {
            currPagPage + 1 < totalPagPages && setCurrPagPage(currPagPage + 1);
            // prev is clicked
        } else {
            currPagPage - 1 >= 0 && setCurrPagPage(currPagPage - 1);
        }
    }

    function navDigitClickHandler(e, clickedPagPage) {
        e.preventDefault();
        setCurrPagPage(clickedPagPage - 1);
    }

    function setSortHandler(e) {
        e.preventDefault();
        // get sort identifier
        const sortBy = $(e.target).text().trim();
        const sortID = sortBy.toLowerCase().replace(/\s/g, "");

        // if none set null
        if (sortID === "none") {
            setSortFuncID("none");
        } else {
            setSortFuncID(sortID);
        }

        // handle reverted sort logic
        if (sortFuncID === sortID && sortID !== "none") {
            setSortReverted((sortReverted) => !sortReverted);
        } else {
            setSortReverted(false);
        }
    }
    // 1. Pagination rules
    toRenderArr =
        totalPagPages > 0
            ? tsData.slice(currPagPage * 8 === 0 ? 0 : currPagPage * 8 - 1, 8)
            : [...tsData];

    // 2. Searchkey filter
    toRenderArr =
        searchKey.length > 0
            ? tsData.filter((elem) => {
                  return (
                      elem.ownerId.toLowerCase().includes(searchKey) ||
                      elem.originalname.toLowerCase().includes(searchKey) ||
                      elem.timestamp.toLowerCase().includes(searchKey)
                  );
              })
            : [...toRenderArr];

    // 3. Sorting
    if (sortFuncID !== "none") {
        toRenderArr = sortTools
            .performSort(toRenderArr, sortFuncID);
    }

    if (sortReverted) {
        toRenderArr = toRenderArr.reverse();
    }

    // 4. Map tsses to react elems arr
    toRender = toRenderArr.map((data) => (
        <TimesheetElement data={data} key={data.fileId} />
    ));

    return (
        <React.Fragment>
            <h3 className="text-center">Timesheets Submitted To You</h3>
            <p className="text-center" style={{ textDecoration: "underlined" }}>
                Click on the card to mark as checked.
            </p>
            <div className="justify-content-center d-flex p-2 pt-4 flex-row">
                <form className="d-flex mx-2">
                    <input
                        className="form-control h-auto"
                        type="search"
                        placeholder="Enter any keyword"
                        aria-label="Search"
                        id="searhBar"
                        onChange={searchBarKeywordHandler}
                    />
                </form>
                <button
                    className="btn btn-outline-secondary dropdown-toggle"
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    id="sortBtn"
                >
                    Sort
                </button>
                <ul className="dropdown-menu">
                    <li>
                        <a
                            onClick={setSortHandler}
                            className="sort-option dropdown-item"
                            href="#"
                        >
                            Submission Date
                        </a>
                    </li>
                    <li>
                        <a
                            onClick={setSortHandler}
                            className="sort-option dropdown-item"
                            href="#"
                        >
                            Checked
                        </a>
                    </li>
                    <li>
                        <a
                            onClick={setSortHandler}
                            className="sort-option dropdown-item"
                            href="#"
                        >
                            Name
                        </a>
                    </li>
                    <li>
                        <a
                            onClick={setSortHandler}
                            className="sort-option dropdown-item"
                            href="#"
                        >
                            None
                        </a>
                    </li>
                </ul>
            </div>

            <div className="pt-1 px-2">
                <div className="row" id="timesheets">
                    {toRender}
                </div>
                {totalPagPages > 0 && searchKey === "" ? (
                    <Pagination
                        totalPages={totalPagPages}
                        navClickHandler={navClickHandler}
                        navDigitClickHandler={navDigitClickHandler}
                        currPagPage={currPagPage}
                    />
                ) : null}
            </div>
        </React.Fragment>
    );
};

export { Timesheet, TimesheetElement };
