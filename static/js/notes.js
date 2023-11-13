const addBox = document.querySelector(".add-box"),
popupBox = document.querySelector(".popup-box"),
popupTitle = popupBox.querySelector("header p"),
closeIcon = popupBox.querySelector("header i"),
titleTag = popupBox.querySelector(".title input"),
descTag = popupBox.querySelector(".description textarea"),
addBtn = popupBox.querySelector("button");

const months = ["January", "February", "March", "April", "May", "June", "July",
              "August", "September", "October", "November", "December"];
let isUpdate = false, updateId;

addBox.addEventListener("click", () => {
    popupTitle.innerText = "Add a new Note";
    addBtn.innerText = "Add Note";
    popupBox.classList.add("show");
    document.querySelector("body").style.overflow = "hidden";
    if(window.innerWidth > 660) titleTag.focus();
});

closeIcon.addEventListener("click", () => {
    isUpdate = false;
    titleTag.value = descTag.value = "";
    popupBox.classList.remove("show");
    document.querySelector("body").style.overflow = "auto";
});

function showNotes(notes) {
    if(!notes) return;
    document.querySelectorAll(".note").forEach(li => li.remove());
    notes.forEach((note, id) => {
        let filterDesc = note.description.replaceAll("\n", '<br/>');
        let liTag = `<li class="note">
                        <div class="details">
                            <p>${note.title}</p>
                            <span>${filterDesc}</span>
                        </div>
                        <div class="bottom-content">
                            <span>${note.date}</span>
                            <div class="settings">
                                <i onclick="showMenu(this)" class="uil uil-ellipsis-h"></i>
                                <ul class="menu">
                                    <li onclick="updateNote(${id}, '${note.title}', '${filterDesc}')"><i class="uil uil-pen"></i>Edit</li>
                                    <li onclick="deleteNote(${id})"><i class="uil uil-trash"></i>Delete</li>
                                </ul>
                            </div>
                        </div>
                    </li>`;
        addBox.insertAdjacentHTML("afterend", liTag);
    });
}

// Fetch notes from the backend and call showNotes
fetch('/get_notes')
    .then(response => response.json())
    .then(data => showNotes(data))
    .catch(error => console.error('Error fetching notes:', error));

function showMenu(elem) {
    elem.parentElement.classList.add("show");
    document.addEventListener("click", e => {
        if(e.target.tagName != "I" || e.target != elem) {
            elem.parentElement.classList.remove("show");
        }
    });
}

function deleteNote(noteId) {
    let confirmDel = confirm("Are you sure you want to delete this note?");
    if(!confirmDel) return;
    // Send a request to delete the note on the backend
    fetch(`/delete_note/${noteId}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            console.log(data.message);
            // Fetch updated notes and display them
            fetch('/get_notes')
                .then(response => response.json())
                .then(updatedNotes => showNotes(updatedNotes))
                .catch(error => console.error('Error fetching notes:', error));
        })
        .catch(error => console.error('Error deleting note:', error));
}

function updateNote(noteId, title, filterDesc) {
    let description = filterDesc.replaceAll('<br/>', '\r\n');
    updateId = noteId;
    isUpdate = true;
    addBox.click();
    titleTag.value = title;
    descTag.value = description;
    popupTitle.innerText = "Update a Note";
    addBtn.innerText = "Update Note";
}

addBtn.addEventListener("click", e => {
    e.preventDefault();
    let title = titleTag.value.trim(),
    description = descTag.value.trim();

    if(title || description) {
        let currentDate = new Date(),
        month = months[currentDate.getMonth()],
        day = currentDate.getDate(),
        year = currentDate.getFullYear();

        let noteInfo = {title, description, date: `${month} ${day}, ${year}`}
        if(!isUpdate) {
            // Send a request to save the new note on the backend
            fetch('/save_note', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(noteInfo),
            })
                .then(response => response.json())
                .then(data => {
                    console.log(data.message);
                    // Fetch updated notes and display them
                    fetch('/get_notes')
                        .then(response => response.json())
                        .then(updatedNotes => showNotes(updatedNotes))
                        .catch(error => console.error('Error fetching notes:', error));
                })
                .catch(error => console.error('Error saving note:', error));
        } else {
            isUpdate = false;
            // Send a request to update the existing note on the backend
            fetch(`/edit_note/${updateId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(noteInfo),
            })
                .then(response => response.json())
                .then(data => {
                    console.log(data.message);
                    // Fetch updated notes and display them
                    fetch('/get_notes')
                        .then(response => response.json())
                        .then(updatedNotes => showNotes(updatedNotes))
                        .catch(error => console.error('Error fetching notes:', error));
                })
                .catch(error => console.error('Error updating note:', error));
        }
        closeIcon.click();
    }
});
