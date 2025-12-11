import React, { useState, useEffect } from "react";
import axios from "axios";

export default function App() {
  const [word, setWord] = useState("");
  const [result, setResult] = useState(null);
  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null);
  const [cards, setCards] = useState([]);
  const [reviewCard, setReviewCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // New folder creation
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [deletingFolder, setDeletingFolder] = useState(null);
  
  // Mobile sidebar toggle
  const [showSidebar, setShowSidebar] = useState(false);
  
  // Flashcard detail/edit modal
  const [selectedCard, setSelectedCard] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    word: "",
    pronunciation: "",
    meaning: "",
    synonyms: "",
    examples: []
  });

  const API_URL = import.meta.env.VITE_API_URL;

  // =============================
  // LOAD FOLDERS
  // =============================
  const loadFolders = async () => {
    try {
      setError(null);
      const res = await axios.get(`${API_URL}/folders`);
      setFolders(res.data);
      
      if (res.data.length > 0 && !activeFolder) {
        setActiveFolder(res.data[0]._id);
      }
    } catch (err) {
      setError("Failed to load folders: " + err.message);
      console.error(err);
    }
  };

  const loadCards = async () => {
    if (!activeFolder) return;
    try {
      setError(null);
      const res = await axios.get(`${API_URL}/cards/${activeFolder}`);
      setCards(res.data);
    } catch (err) {
      setError("Failed to load cards: " + err.message);
      console.error(err);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    loadCards();
  }, [activeFolder]);

  // =============================
  // CREATE FOLDER
  // =============================
  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      await axios.post(`${API_URL}/folders`, { name: newFolderName });
      setNewFolderName("");
      setShowNewFolder(false);
      await loadFolders();
    } catch (err) {
      setError("Failed to create folder: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // DELETE FOLDER
  // =============================
  const deleteFolder = async (folderId, folderName) => {
    if (!window.confirm(`Delete folder "${folderName}" and all its flashcards? This cannot be undone!`)) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await axios.delete(`${API_URL}/folders/${folderId}`);
      
      // If deleted folder was active, clear selection
      if (activeFolder === folderId) {
        setActiveFolder(null);
        setCards([]);
      }
      
      await loadFolders();
    } catch (err) {
      setError("Failed to delete folder: " + err.message);
    } finally {
      setLoading(false);
      setDeletingFolder(null);
    }
  };

  // =============================  
  // GENERATE FLASHCARD  
  // =============================
  const generate = async () => {
    if (!word.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      const res = await axios.post(`${API_URL}/api/flashcard`, { word });
      setResult(res.data);
      setWord("");
    } catch (err) {
      setError("Failed to generate flashcard: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // SAVE FLASHCARD (CREATE)
  // =============================
  const save = async () => {
    if (!activeFolder) {
      setError("Please select a folder first");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await axios.post(`${API_URL}/api/save`, {
        ...result,
        folderId: activeFolder
      });
      setResult(null);
      await loadCards();
    } catch (err) {
      setError("Failed to save flashcard: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // VIEW FLASHCARD DETAILS
  // =============================
  const viewCard = (card) => {
    setSelectedCard(card);
    setIsEditing(false);
    setEditForm({
      word: card.word,
      pronunciation: card.pronunciation,
      meaning: card.meaning,
      synonyms: card.synonyms,
      examples: card.examples || []
    });
  };

  // =============================
  // UPDATE FLASHCARD
  // =============================
  const updateCard = async () => {
    try {
      setLoading(true);
      setError(null);
      await axios.put(`${API_URL}/api/cards/${selectedCard._id}`, editForm);
      await loadCards();
      setSelectedCard(null);
      setIsEditing(false);
    } catch (err) {
      setError("Failed to update flashcard: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // DELETE FLASHCARD
  // =============================
  const deleteCard = async (cardId) => {
    if (!window.confirm("Are you sure you want to delete this flashcard?")) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await axios.delete(`${API_URL}/api/cards/${cardId}`);
      await loadCards();
      setSelectedCard(null);
    } catch (err) {
      setError("Failed to delete flashcard: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // REVIEW MODE
  // =============================
  const startReview = () => {
    const due = cards.filter(c => new Date(c.nextReview) <= Date.now());
    if (due.length === 0) {
      alert("No cards to review! All cards are scheduled for later.");
      return;
    }
    setReviewCard(due[0]);
  };

  const review = async (rating) => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/review`, {
        id: reviewCard._id,
        rating
      });
      await loadCards();
      setReviewCard(null);
    } catch (err) {
      setError("Failed to review card: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle example input changes
  const updateExample = (index, value) => {
    const newExamples = [...editForm.examples];
    newExamples[index] = value;
    setEditForm({ ...editForm, examples: newExamples });
  };

  const addExample = () => {
    setEditForm({ ...editForm, examples: [...editForm.examples, ""] });
  };

  const removeExample = (index) => {
    const newExamples = editForm.examples.filter((_, i) => i !== index);
    setEditForm({ ...editForm, examples: newExamples });
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* -------------- MOBILE MENU BUTTON -------------- */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-blue-600 text-white p-3 rounded-lg shadow-lg"
      >
        {showSidebar ? "✕" : "☰"}
      </button>

      {/* -------------- SIDEBAR -------------- */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-40
        w-64 bg-white h-screen p-4 border-r shadow-lg lg:shadow-sm overflow-y-auto
        transform transition-transform duration-300 ease-in-out
        ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between mb-4 mt-12 lg:mt-0">
          <h2 className="text-xl font-bold">Folders</h2>
          <button 
            onClick={() => setShowNewFolder(!showNewFolder)}
            className="text-blue-600 hover:text-blue-800 text-2xl font-bold"
            title="Add folder"
          >
            +
          </button>
        </div>

        {showNewFolder && (
          <div className="mb-3 p-2 bg-gray-50 rounded">
            <input
              className="w-full p-2 border rounded mb-2 text-sm"
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createFolder()}
              autoFocus
            />
            <div className="flex gap-2">
              <button 
                className="flex-1 bg-blue-600 text-white px-2 py-1 rounded text-sm"
                onClick={createFolder}
                disabled={loading}
              >
                Create
              </button>
              <button 
                className="flex-1 bg-gray-300 px-2 py-1 rounded text-sm"
                onClick={() => {
                  setShowNewFolder(false);
                  setNewFolderName("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {folders.length === 0 ? (
          <p className="text-gray-500 text-sm">No folders yet. Create one!</p>
        ) : (
          folders.map(f => (
            <div
              key={f._id}
              className={`group relative p-2 rounded cursor-pointer hover:bg-blue-50 transition mb-1 ${
                activeFolder === f._id ? "bg-blue-100 border-l-4 border-blue-600" : ""
              }`}
            >
              <div 
                className="flex items-center justify-between"
                onClick={() => {
                  setActiveFolder(f._id);
                  setShowSidebar(false); // Close sidebar on mobile after selection
                }}
              >
                <span>📁 {f.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFolder(f._id, f.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition px-2"
                  title="Delete folder"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* -------------- MOBILE OVERLAY -------------- */}
      {showSidebar && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* -------------- MAIN AREA -------------- */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto pt-20 lg:pt-6">

        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Flashcard Generator</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            <button 
              onClick={() => setError(null)} 
              className="float-right font-bold"
            >
              ×
            </button>
          </div>
        )}

        {!activeFolder ? (
          <div className="text-center py-12 px-4 text-gray-500">
            <p className="text-lg sm:text-xl mb-2">
              <span className="lg:inline hidden">👈 </span>
              <span className="lg:hidden">☰ Tap menu to </span>
              Select or create a folder to get started
            </p>
            <p className="text-sm">Organize your flashcards by topic or subject</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <input
                className="flex-1 p-3 border rounded shadow-sm text-sm sm:text-base"
                placeholder="Enter a word to generate a flashcard..."
                value={word}
                onChange={(e) => setWord(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && generate()}
                disabled={loading}
              />
              <button 
                className="bg-blue-600 text-white px-6 py-3 rounded shadow hover:bg-blue-700 transition disabled:opacity-50 whitespace-nowrap"
                onClick={generate}
                disabled={loading || !word.trim()}
              >
                {loading ? "Generating..." : "Generate"}
              </button>
            </div>

            {result && (
              <div className="p-4 sm:p-6 border rounded-lg mb-6 bg-white shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <b className="text-xl sm:text-2xl text-blue-700">{result.word}</b>
                  <button 
                    onClick={() => setResult(null)}
                    className="text-gray-400 hover:text-gray-600 text-xl"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-2 mb-4 text-sm sm:text-base">
                  <p><span className="font-semibold">Pronunciation:</span> {result.pronunciation}</p>
                  <p><span className="font-semibold">Meaning:</span> {result.meaning}</p>
                  <p><span className="font-semibold">Synonyms:</span> {result.synonyms}</p>
                </div>

                <div className="mb-4 text-sm sm:text-base">
                  <p className="font-semibold mb-2">Examples:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    {result.examples.map((x, i) => (
                      <li key={i} className="text-gray-700">{x}</li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={save}
                  className="bg-green-600 text-white p-3 rounded w-full hover:bg-green-700 transition disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "💾 Save to Folder"}
                </button>
              </div>
            )}

            <div className="mb-6">
              <button
                className="bg-purple-600 text-white px-4 sm:px-6 py-3 rounded shadow hover:bg-purple-700 transition text-sm sm:text-base"
                onClick={startReview}
              >
                🎯 Start Review ({cards.filter(c => new Date(c.nextReview) <= Date.now()).length} due)
              </button>
            </div>

            <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <h2 className="text-xl sm:text-2xl font-bold">Your Flashcards</h2>
              <span className="text-gray-500 text-sm sm:text-base">{cards.length} cards</span>
            </div>

            {cards.length === 0 ? (
              <div className="text-center py-12 px-4 text-gray-400">
                <p className="text-base sm:text-lg">No flashcards yet</p>
                <p className="text-sm">Generate and save your first card!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {cards.map(card => (
                  <div 
                    key={card._id} 
                    className="p-3 sm:p-4 border rounded-lg bg-white shadow hover:shadow-lg transition cursor-pointer"
                    onClick={() => viewCard(card)}
                  >
                    <b className="text-base sm:text-lg text-blue-700">{card.word}</b>
                    <p className="text-xs sm:text-sm text-gray-600 mt-2 line-clamp-2">{card.meaning}</p>
                    <div className="mt-2 sm:mt-3 text-xs text-gray-400">
                      Next review: {new Date(card.nextReview).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* -------------- FLASHCARD DETAIL/EDIT MODAL -------------- */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            
            {!isEditing ? (
              // VIEW MODE
              <>
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl sm:text-3xl font-bold text-blue-700 pr-4">{selectedCard.word}</h2>
                  <button 
                    onClick={() => setSelectedCard(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl flex-shrink-0"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-3 sm:space-y-4 mb-6 text-sm sm:text-base">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Pronunciation</p>
                    <p className="text-base sm:text-lg">{selectedCard.pronunciation}</p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-600">Meaning</p>
                    <p className="text-base sm:text-lg">{selectedCard.meaning}</p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-600">Synonyms</p>
                    <p className="text-base sm:text-lg">{selectedCard.synonyms}</p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-2">Examples</p>
                    <ul className="list-disc ml-5 space-y-1">
                      {selectedCard.examples?.map((ex, i) => (
                        <li key={i} className="text-gray-700">{ex}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 border-t text-xs sm:text-sm">
                    <p className="text-gray-500">
                      Created: {new Date(selectedCard.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-gray-500">
                      Next review: {new Date(selectedCard.nextReview).toLocaleDateString()}
                    </p>
                    <p className="text-gray-500">
                      Reviews: {selectedCard.repetitions} | Ease: {selectedCard.ease?.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 bg-blue-600 text-white py-2 sm:py-3 rounded hover:bg-blue-700 transition"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => deleteCard(selectedCard._id)}
                    className="flex-1 bg-red-500 text-white py-2 sm:py-3 rounded hover:bg-red-600 transition"
                    disabled={loading}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </>
            ) : (
              // EDIT MODE
              <>
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold">Edit Flashcard</h2>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-3 sm:space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Word</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded text-sm sm:text-base"
                      value={editForm.word}
                      onChange={(e) => setEditForm({ ...editForm, word: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Pronunciation</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded text-sm sm:text-base"
                      value={editForm.pronunciation}
                      onChange={(e) => setEditForm({ ...editForm, pronunciation: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Meaning</label>
                    <textarea
                      className="w-full p-2 border rounded text-sm sm:text-base"
                      rows="3"
                      value={editForm.meaning}
                      onChange={(e) => setEditForm({ ...editForm, meaning: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Synonyms</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded text-sm sm:text-base"
                      value={editForm.synonyms}
                      onChange={(e) => setEditForm({ ...editForm, synonyms: e.target.value })}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-semibold text-gray-600">Examples</label>
                      <button
                        onClick={addExample}
                        className="text-blue-600 text-xs sm:text-sm hover:text-blue-800"
                      >
                        + Add Example
                      </button>
                    </div>
                    {editForm.examples.map((ex, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          className="flex-1 p-2 border rounded text-sm sm:text-base"
                          value={ex}
                          onChange={(e) => updateExample(i, e.target.value)}
                          placeholder={`Example ${i + 1}`}
                        />
                        <button
                          onClick={() => removeExample(i)}
                          className="px-2 sm:px-3 bg-red-100 text-red-600 rounded hover:bg-red-200 text-sm"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={updateCard}
                    className="flex-1 bg-green-600 text-white py-2 sm:py-3 rounded hover:bg-green-700 transition"
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "💾 Save Changes"}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-gray-300 py-2 sm:py-3 rounded hover:bg-gray-400 transition"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* -------------- REVIEW MODAL -------------- */}
      {reviewCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-2xl w-full max-w-md">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-blue-700">{reviewCard.word}</h2>
            <p className="text-sm sm:text-base text-gray-700 mb-2">{reviewCard.pronunciation}</p>
            <p className="text-sm sm:text-base text-gray-800 mb-4">{reviewCard.meaning}</p>
            
            {reviewCard.examples && reviewCard.examples.length > 0 && (
              <div className="mb-6 text-xs sm:text-sm text-gray-600">
                <p className="font-semibold mb-1">Example:</p>
                <p className="italic">{reviewCard.examples[0]}</p>
              </div>
            )}

            <p className="text-xs sm:text-sm text-gray-500 mb-4">How well did you know this?</p>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <button 
                className="bg-red-500 text-white px-3 sm:px-4 py-2 sm:py-3 rounded hover:bg-red-600 transition text-sm sm:text-base"
                onClick={() => review("again")}
                disabled={loading}
              >
                Again
              </button>
              <button 
                className="bg-yellow-500 text-white px-3 sm:px-4 py-2 sm:py-3 rounded hover:bg-yellow-600 transition text-sm sm:text-base"
                onClick={() => review("hard")}
                disabled={loading}
              >
                Hard
              </button>
              <button 
                className="bg-blue-500 text-white px-3 sm:px-4 py-2 sm:py-3 rounded hover:bg-blue-600 transition text-sm sm:text-base"
                onClick={() => review("good")}
                disabled={loading}
              >
                Good
              </button>
              <button 
                className="bg-green-600 text-white px-3 sm:px-4 py-2 sm:py-3 rounded hover:bg-green-700 transition text-sm sm:text-base"
                onClick={() => review("easy")}
                disabled={loading}
              >
                Easy
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}