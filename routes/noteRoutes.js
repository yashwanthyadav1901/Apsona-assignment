const express = require("express");
const router = express.Router();
const notesController = require("../controllers/notesController");
const verifyJWT = require("../middleware/verifyJWT");

router.use(verifyJWT);

router
  .route("/")
  .get(notesController.getAllNotes)
  .post(notesController.createNewNote)
  .put(notesController.updateNote)
  .delete(notesController.deleteNote);

router
  .route("/archive")
  .get(notesController.getArchivedNotes)
  .put(notesController.archiveNotes);

router.route("/trash").get(notesController.getTrashedNotes);

router.route("/restore").post(notesController.restoreTrashedNote);

router.route("/search").get(notesController.searchNotes);

router.route("/tag/:tag").get(notesController.getNotesByTag);

router.route("/background").put(notesController.updateNoteBackgroundColor);

module.exports = router;
