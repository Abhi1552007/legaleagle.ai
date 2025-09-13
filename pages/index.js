import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../styles/Home.module.css';
import SaulChatbot from '../components/SaulChatbot';

export default function Home() {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [documentText, setDocumentText] = useState('');
  const [showSaul, setShowSaul] = useState(false);
  const fileInputRef = useRef(null);

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setError('');
      } else {
        setError('Please upload a PDF file only');
      }
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setProcessing(true);
    setError('');
    setDownloadUrl(null);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 10;
      });
    }, 500);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/summarize', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process file');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setProgress(100);

      // Set document text for Saul (simplified for demo)
      setDocumentText(
        `This is a legal document titled "${file.name}". The document contains various legal clauses and provisions that Saul can help explain based on common legal document patterns.`
      );

    } catch (err) {
      setError(err.message);
    }

    clearInterval(progressInterval);
    setProcessing(false);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.container}>
      {/* Animated Background */}
      <div className={styles.backgroundPattern}>
        <div className={styles.circle1}></div>
        <div className={styles.circle2}></div>
        <div className={styles.circle3}></div>
      </div>

      <motion.main
        className={styles.main}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Header Section */}
        <motion.div
          className={styles.header}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className={styles.logoContainer}>
            <motion.div
              className={styles.eagleIcon}
              animate={{
                rotate: [0, 5, -5, 0],
                scale: [1, 1.05, 1]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              ⚖️
            </motion.div>
            <h1 className={styles.title}>
              Legal <span className={styles.highlight}>Eagle</span> Summarizer
            </h1>
          </div>
          <p className={styles.subtitle}>
            Transform complex legal documents into clear, simple summaries powered by AI
          </p>
        </motion.div>

        {/* Upload Section */}
        <motion.div
          className={styles.uploadSection}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div
            className={`${styles.dropZone} ${dragActive ? styles.dragActive : ''} ${file ? styles.hasFile : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={openFileDialog}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              disabled={processing}
              className={styles.hiddenInput}
            />

            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={styles.uploadContent}
                >
                  <motion.div
                    className={styles.uploadIcon}
                    animate={{ y: [-5, 5, -5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    📄
                  </motion.div>
                  <h3>Drop your PDF here or click to browse</h3>
                  <p>Supports PDF files up to 10MB</p>
                </motion.div>
              ) : (
                <motion.div
                  key="file-selected"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={styles.fileInfo}
                >
                  <div className={styles.fileIcon}>📋</div>
                  <div className={styles.fileDetails}>
                    <h4>{file.name}</h4>
                    <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={styles.changeFileBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setDocumentText('');
                      setDownloadUrl(null);
                      setShowSaul(false);
                    }}
                  >
                    ✕
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Process Button */}
          <motion.button
            className={`${styles.processBtn} ${(!file || processing) ? styles.disabled : ''}`}
            disabled={!file || processing}
            onClick={handleUpload}
            whileHover={(!file || processing) ? {} : { scale: 1.02, boxShadow: "0 8px 32px rgba(0, 112, 243, 0.3)" }}
            whileTap={(!file || processing) ? {} : { scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            {processing ? (
              <div className={styles.processingContent}>
                <motion.div
                  className={styles.spinner}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  ⚡
                </motion.div>
                Processing Magic...
              </div>
            ) : (
              <div className={styles.buttonContent}>
                <span className={styles.buttonIcon}>🚀</span>
                Transform Document
              </div>
            )}
          </motion.button>

          {/* Progress Bar */}
          <AnimatePresence>
            {processing && (
              <motion.div
                className={styles.progressContainer}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className={styles.progressBar}>
                  <motion.div
                    className={styles.progressFill}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className={styles.progressText}>{Math.round(progress)}% Complete</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Results Section */}
        <AnimatePresence>
          {downloadUrl && (
            <motion.div
              className={styles.resultsSection}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.9 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className={styles.successIcon}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.6, delay: 0.2 }}
              >
                ✅
              </motion.div>
              <h3>Summary Ready!</h3>
              <p>Your legal document has been successfully summarized</p>
              <motion.a
                href={downloadUrl}
                download={`${file?.name?.replace('.pdf', '') || 'document'}_summary.pdf`}
                className={styles.downloadBtn}
                whileHover={{ scale: 1.05, boxShadow: "0 6px 20px rgba(34, 197, 94, 0.3)" }}
                whileTap={{ scale: 0.95 }}
              >
                <span className={styles.downloadIcon}>⬇️</span>
                Download Summary PDF
              </motion.a>

              {/* Saul Section */}
              {!showSaul && (
                <motion.div
                  className={styles.saulSection}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <motion.button
                    className={styles.saulButton}
                    onClick={() => setShowSaul(true)}
                    whileHover={{ scale: 1.05, boxShadow: "0 12px 40px rgba(255, 215, 0, 0.6)" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className={styles.saulIcon}>👨‍💼</span>
                    Chat with Legal Expert Saul
                  </motion.button>
                  <p className={styles.saulDescription}>
                    Need clarification? Ask Saul Goodman anything about your document's terms, obligations, and legal implications.
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {error && (
            <motion.div
              className={styles.errorSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className={styles.errorIcon}>❌</div>
              <p>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Features Section */}
        <motion.div
          className={styles.features}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <div className={styles.feature}>
            <motion.div
              className={styles.featureIcon}
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              🧠
            </motion.div>
            <h4>AI-Powered</h4>
            <p>Advanced AI understanding of legal language</p>
          </div>
          <div className={styles.feature}>
            <motion.div
              className={styles.featureIcon}
              whileHover={{ scale: 1.1, rotate: -5 }}
            >
              ⚡
            </motion.div>
            <h4>Lightning Fast</h4>
            <p>Get summaries in seconds, not hours</p>
          </div>
          <div className={styles.feature}>
            <motion.div
              className={styles.featureIcon}
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              👨‍💼
            </motion.div>
            <h4>Ask Saul</h4>
            <p>Interactive legal expert to answer your questions</p>
          </div>
        </motion.div>
      </motion.main>

      {/* Saul Chatbot as Modal */}
      <AnimatePresence>
        {showSaul && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.modalContent}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SaulChatbot
                documentText={documentText}
                fileName={file?.name || 'document'}
                onClose={() => setShowSaul(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
