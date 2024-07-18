const Note = require("../models/Note");
const User = require("../models/User");

const getAllNotes = async (req, res) => {
  const notes = await Note.find().lean();

  if (!notes?.length) {
    return res.status(400).json({ message: "No notes found" });
  }

  const notesWithUser = await Promise.all(
    notes.map(async (note) => {
      const user = await User.findById(note.userId).lean().exec();
      return { ...note, username: user.username };
    })
  );

  res.json(notesWithUser);
};

const createNewNote = async (req, res) => {
  const { userId, title, content, tags, backgroundColor } = req.body;

  if (!userId || !title || !content) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const duplicate = await Note.findOne({ title })
    .collation({ locale: "en", strength: 2 })
    .lean()
    .exec();

  if (duplicate) {
    return res.status(409).json({ message: "Duplicate note title" });
  }

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

  const note = await Note.findById(id).exec();

  if (!note) {
    return res.status(400).json({ message: "Note not found" });
  }

  const result = await note.deleteOne();

  const reply = `Note '${result.title}' with ID ${result._id} deleted`;

  res.json(reply);
};

const getArchivedNotes = async (req, res) => {
  const notes = await Note.find({ isArchived: true }).lean();

  if (!notes?.length) {
    return res.status(400).json({ message: "No archived notes found" });
  }

  res.json(notes);
};

const getTrashedNotes = async (req, res) => {
  const notes = await Note.find({ isTrashed: true }).lean();

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
  const { tag } = req.params;

  if (!tag) {
    return res.status(400).json({ message: "Tag parameter is required" });
  }

  const notes = await Note.find({ tags: tag }).lean();

  if (!notes?.length) {
    return res
      .status(400)
      .json({ message: "No notes found with the specified tag" });
  }

  const notesWithUser = await Promise.all(
    notes.map(async (note) => {
      const user = await User.findById(note.userId).lean().exec();
      return { ...note, username: user.username };
    })
  );

  res.json(notesWithUser);
};

const updateNoteBackgroundColor = async (req, res) => {
  const { id, backgroundColor } = req.body;

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
  getArchivedNotes,
  getTrashedNotes,
  restoreTrashedNote,
  searchNotes,
  getNotesByTag,
  updateNoteBackgroundColor,
};
