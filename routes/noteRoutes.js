const express = require("express");
const router = express.Router();
const notesController = require("../controllers/notesController");

router.get("/notes", notesController.getAllNotes);
router.post("/notes", notesController.createNewNote);
router.put("/notes", notesController.updateNote);
router.delete("/notes", notesController.deleteNote);
router.get("/notes/archived", notesController.getArchivedNotes);
router.get("/notes/trash", notesController.getTrashedNotes);
router.post("/notes/restore", notesController.restoreTrashedNote);
router.get("/notes/search", notesController.searchNotes);
router.get("/notes/tag/:tag", notesController.getNotesByTag);
router.put("/notes/background", notesController.updateNoteBackgroundColor);

module.exports = router;
