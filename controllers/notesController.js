const Note = require("../models/Note");
const User = require("../models/User");

const getAllNotes = async (req, res) => {
  try {
    const userId = req.userId; // Get the user ID from the middleware

    // Get all notes of the current user from MongoDB, excluding archived and trashed notes
    const notes = await Note.find({
      userId: userId,
      isArchived: false,
      isTrashed: false,
    }).lean();

    // If no notes found, return a 400 status with a message
    if (!notes?.length) {
      return res.status(400).json({ message: "No notes found" });
    }

    // Add username to each note before sending the response
    const notesWithUser = await Promise.all(
      notes.map(async (note) => {
        const user = await User.findById(note.user).lean().exec();
        return { ...note }; // Assuming the User model has a 'username' field
      })
    );

    // Send the notes with username added to each note
    res.json(notesWithUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const createNewNote = async (req, res) => {
  const userId = req.userId;
  const { title, content, tags, backgroundColor } = req.body;

  if (!userId || !title || !content) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check for duplicate note title for the current user only
  const duplicate = await Note.findOne({ userId, title })
    .collation({ locale: "en", strength: 2 })
    .lean()
    .exec();

  if (duplicate) {
    return res.status(409).json({ message: "Duplicate note title" });
  }

  try {
    const note = await Note.create({
      userId,
      title,
      content,
      tags,
      backgroundColor,
    });

    if (note) {
      return res.status(201).json({ message: "New note created" });
    } else {
      return res.status(400).json({ message: "Invalid note data received" });
    }
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateNote = async (req, res) => {
  const {
    id,
    userId,
    title,
    content,
    tags,
    backgroundColor,
    isArchived,
    isTrashed,
  } = req.body;

  if (!id || !userId || !title || !content) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const note = await Note.findById(id).exec();

  if (!note) {
    return res.status(400).json({ message: "Note not found" });
  }

  const duplicate = await Note.findOne({ title })
    .collation({ locale: "en", strength: 2 })
    .lean()
    .exec();

  if (duplicate && duplicate._id.toString() !== id) {
    return res.status(409).json({ message: "Duplicate note title" });
  }

  note.userId = userId;
  note.title = title;
  note.content = content;
  note.tags = tags;
  note.backgroundColor = backgroundColor;
  note.isArchived = isArchived;
  note.isTrashed = isTrashed;

  const updatedNote = await note.save();

  res.json(`'${updatedNote.title}' updated`);
};

const deleteNote = async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "Note ID required" });
  }

  try {
    const note = await Note.findById(id).exec();

    if (!note) {
      return res.status(400).json({ message: "Note not found" });
    }

    note.isTrashed = true;
    note.trashUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const result = await note.save();

    const reply = `Note '${result.title}' with ID ${result._id} deleted and moved to trash`;

    res.json(reply);
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while deleting note and moving to trash",
      error,
    });
  }
};

const archiveNotes = async (req, res) => {
  let { ids } = req.body;
  console.log(ids);

  if (!Array.isArray(ids)) {
    ids = [ids];
  }

  if (!ids.every((id) => typeof id === "string")) {
    return res
      .status(400)
      .json({ message: "Array of valid note IDs is required" });
  }

  try {
    const result = await Note.updateMany(
      { _id: { $in: ids } },
      { $set: { isArchived: true } }
    );

    if (result.nModified === 0) {
      return res.status(400).json({ message: "No notes were archived" });
    }

    res.status(200).json({ message: "Notes archived successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while archiving notes", error });
  }
};

const getArchivedNotes = async (req, res) => {
  try {
    const userId = req.userId; // Assumes user ID is available in req.user

    const notes = await Note.find({ userId: userId, isArchived: true }).lean();

    if (!notes.length) {
      return res.status(400).json({ message: "No archived notes found" });
    }

    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getTrashedNotes = async (req, res) => {
  const userId = req.userId;
  const notes = await Note.find({ userId: userId, isTrashed: true }).lean();

  if (!notes?.length) {
    return res.status(400).json({ message: "No trashed notes found" });
  }

  res.json(notes);
};

const restoreTrashedNote = async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "Note ID required" });
  }

  const note = await Note.findById(id).exec();

  if (!note) {
    return res.status(400).json({ message: "Note not found" });
  }

  note.isTrashed = false;

  const restoredNote = await note.save();

  res.json(`Note '${restoredNote.title}' restored from trash`);
};

const searchNotes = async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ message: "Query parameter is required" });
  }

  const notes = await Note.find({
    $or: [
      { title: { $regex: query, $options: "i" } },
      { content: { $regex: query, $options: "i" } },
      { tags: { $regex: query, $options: "i" } },
    ],
  }).lean();

  if (!notes?.length) {
    return res
      .status(400)
      .json({ message: "No notes found matching the query" });
  }

  const notesWithUser = await Promise.all(
    notes.map(async (note) => {
      const user = await User.findById(note.userId).lean().exec();
      return { ...note, username: user.username };
    })
  );

  res.json(notesWithUser);
};

const getNotesByTag = async (req, res) => {
  const userId = req.userId;
  const { tag } = req.params;

  if (!tag) {
    return res.status(400).json({ message: "Tag parameter is required" });
  }

  const notes = await Note.find({ userId: userId, tags: tag }).lean();

  if (!notes?.length) {
    return res
      .status(400)
      .json({ message: "No notes found with the specified tag" });
  }

  const notesWithUser = await Promise.all(
    notes.map(async (note) => {
      const user = await User.findById(note.userId).lean().exec();
      return { ...note };
    })
  );

  res.json(notesWithUser);
};

const updateNoteBackgroundColor = async (req, res) => {
  const { id, backgroundColor } = req.body;
  console.log(id, backgroundColor);

  if (!id || !backgroundColor) {
    return res
      .status(400)
      .json({ message: "Note ID and background color are required" });
  }

  const note = await Note.findById(id).exec();

  if (!note) {
    return res.status(400).json({ message: "Note not found" });
  }

  note.backgroundColor = backgroundColor;

  const updatedNote = await note.save();

  res.json(
    `Note '${updatedNote.title}' background color updated to ${updatedNote.backgroundColor}`
  );
};

module.exports = {
  getAllNotes,
  createNewNote,
  updateNote,
  deleteNote,
  archiveNotes,
  getArchivedNotes,
  getTrashedNotes,
  restoreTrashedNote,
  searchNotes,
  getNotesByTag,
  updateNoteBackgroundColor,
};
