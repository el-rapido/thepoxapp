"use client";

import React, { ChangeEvent, useEffect, useState } from "react";
import { Popup, PopupBody } from "@/app/components/Popup";
import "@/app/styles/main.css";
import "@/app/styles/reviewpopup.css";
import "@/app/styles/changePrediction.css";

import useFileUpload from "@/app/hooks/useFileUpload";
import Loader from "@/app/components/Loader/Loader";
import { LABEL_FOLDERS, normalizeLabelFolder } from "@/lib/labels";

const DOMAIN = "http://pox.carboncloud.pro";

export default function Predict() {
    const [availableChoices, setAvailableChoices] = useState<string[]>([
        ...LABEL_FOLDERS,
    ]);
    const [reviewPopup, setReviewPopup] = useState(false);
    const [changePredictionPopup, setChangePredictionPopup] = useState(false);
    const [imageURL, setImageURL] = useState<undefined | string>(undefined);
    const [image, setImage] = useState<undefined | File>(undefined);
    const [absoluteImageURL, setAbsoluteImageURL] = useState("");
    const [predictedResults, setPredictedResults] = useState({
        className: "...",
        date: "...",
    });
    const [userQuestion, setUserQuestion] = useState("");
    const [isPredicting, setIsPredicting] = useState(false);
    const [gptResult, setGPTResult] = useState("...");
    const [changingPrediction, setChangingPrediction] = useState(false);
    const [selectedChoice, setSelectedChoice] = useState("");
    const [userComment, setUserComment] = useState("");
    const [regularFilename, setRegularFilename] = useState("");
    const [predictionRecordId, setPredictionRecordId] = useState<number | null>(null);
    const [changeValidationError, setChangeValidationError] = useState("");

    const { uploadFile, isUploading } = useFileUpload();

    useEffect(() => {
        let active = true;

        (async () => {
            try {
                const result = await fetch("/api/reference", {
                    method: "GET",
                    cache: "no-store",
                });

                if (!result.ok) return;

                const payload = await result.json();
                if (active && Array.isArray(payload?.labels)) {
                    setAvailableChoices(payload.labels);
                }
            } catch (error) {
                console.error(error);
            }
        })();

        return () => {
            active = false;
        };
    }, []);

    async function handleAskQuestion() {
        const prediction = predictedResults.className.trim();
        const question = userQuestion.trim();

        if (!prediction || !question) {
            alert("prediction or question fields are empty");
            return;
        }

        const result = await fetch("/api/askgpt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prediction, question, absoluteImageURL }),
        });

        setGPTResult(await result.text());
    }

    async function commentOnImage(
        comment: string,
        imagePath: string,
        classification: string,
        changedClassification: string,
        predictionId: number | null
    ) {
        try {
            const result = await fetch("/api/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    comment,
                    imagePath,
                    classification,
                    changedClassification,
                    predictionId,
                }),
            });

            return JSON.parse(await result.text());
        } catch (error) {
            console.error(error);
        }
    }

    async function startPrediction() {
        try {
            if (!image) return;

            const uploadResult = await uploadFile(image);
            if (!uploadResult) throw new Error("Image upload failed");

            const fileName = uploadResult.filePath.split("/uploads/")[1];
            if (!fileName) throw new Error("Could not determine the uploaded filename");

            setIsPredicting(true);

            const prediction = await fetch("/api/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileName }),
            });

            const predictionText = await prediction.text();

            if (!prediction.ok) {
                throw new Error(predictionText || `Prediction API failed with status ${prediction.status}`);
            }

            let predictionData;
            try {
                predictionData = JSON.parse(predictionText);
            } catch (parseError) {
                console.error("Prediction JSON parse failed:", parseError);
                throw new Error("Prediction response could not be parsed as JSON");
            }

            const predictionResults = predictionData?.classification;
            if (!predictionResults) throw new Error("Prediction response is missing classification data");

            setRegularFilename(fileName);
            setAbsoluteImageURL(`${DOMAIN}/uploads/${fileName}`);

            const accuracy = Number(predictionResults.max_prob);
            const rawPredictedClass =
                accuracy < 0.65 ? "not-identified" : predictionResults.predicted_class;
            const predictedClass = normalizeLabelFolder(rawPredictedClass) ?? "not-identified";

            setPredictedResults({
                className: predictedClass,
                date: new Date().toDateString(),
            });

            const predictionLogResponse = await fetch("/api/predictions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uploadedImageId: uploadResult.uploadId,
                    imagePath: fileName,
                    predictedClass,
                    finalClass: predictedClass,
                    confidence: Number.isFinite(accuracy) ? accuracy : null,
                    modelName: "model_10-0.92.keras",
                }),
            });

            if (predictionLogResponse.ok) {
                const predictionLog = await predictionLogResponse.json();
                setPredictionRecordId(predictionLog.id ?? null);
            } else {
                setPredictionRecordId(null);
            }

            setSelectedChoice(predictedClass);
            setUserComment("");
            setChangeValidationError("");
            setImage(undefined);
            setReviewPopup(true);
        } catch (error) {
            console.error(error);
        } finally {
            setIsPredicting(false);
        }
    }

    function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
        try {
            if (event.target.files) {
                const file = event.target.files[0];
                setImage(file);
                setImageURL(URL.createObjectURL(file));
            }
        } catch (error) {
            setImageURL(undefined);
            setImage(undefined);
            console.error(error);
        }
    }

    async function confirmPredictionChanges() {
        const finalChoice = normalizeLabelFolder(selectedChoice.trim()) ?? "";
        if (!finalChoice) {
            setChangeValidationError("Please choose the final prediction.");
            return;
        }

        setChangingPrediction(true);
        setChangeValidationError("");

        try {
            const currentClassification = predictedResults.className;

            if (finalChoice !== currentClassification) {
                await fetch("/api/reference", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileName: regularFilename, folderName: finalChoice }),
                });
            }

            if (predictionRecordId) {
                await fetch(`/api/predictions/${predictionRecordId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ finalClass: finalChoice }),
                });
            }

            await commentOnImage(
                userComment,
                regularFilename,
                currentClassification,
                finalChoice,
                predictionRecordId
            );

            setPredictedResults((prev) => ({ ...prev, className: finalChoice }));
            setChangePredictionPopup(false);
        } catch (error) {
            console.error(error);
        } finally {
            setChangingPrediction(false);
        }
    }

    return (
        <>
            <div className="predict-page-upload">
                <label htmlFor="image-predict" className="image-upload-wrapper">
                    {imageURL == undefined ? (
                        <div className="select-image">
                            Click here to select or take an image to predict
                        </div>
                    ) : (
                        <img
                            src={imageURL}
                            className="image-predict-chosen-preview"
                            alt=""
                        />
                    )}

                    <input
                        style={{ display: "none" }}
                        type="file"
                        id="image-predict"
                        accept="image/*"
                        onChange={handleImageChange}
                    />
                </label>

                <div
                    className="button"
                    onClick={startPrediction}
                    style={{
                        justifySelf: "center",
                        cursor: image ? "pointer" : "not-allowed",
                        opacity: image ? 1 : 0.5,
                    }}
                >
                    {isUploading || isPredicting ? "Analyzing..." : "Start Prediction"}
                </div>

                {(isUploading || isPredicting) && <Loader />}
            </div>

            {reviewPopup && (
                <Popup
                    title="Prediction Results"
                    onClose={() => {
                        setReviewPopup(false);
                        setImageURL(undefined);
                    }}
                >
                    <PopupBody size={{ width: "70vw", height: "auto" }}>
                        <div className="prediction-view-body">
                            <div className="image-view-wrapper">
                                {!imageURL && <Loader />}
                                {imageURL && (
                                    <img
                                        className="image-review-view"
                                        alt=""
                                        src={imageURL}
                                    />
                                )}
                                <div className="gpt-ask-container">
                                    <input
                                        type="text"
                                        placeholder="Ask about the prediction..."
                                        onChange={(e) => setUserQuestion(e.target.value)}
                                    />
                                    <button type="button" onClick={handleAskQuestion}>
                                        Ask AI
                                    </button>
                                </div>
                            </div>

                            <div className="image-view-details-wrapper">
                                <div className="stretch-container simple-grid">
                                    <div className="simple-grid">
                                        <p className="subheading">Prediction Result</p>
                                        <p className="stand-out">{predictedResults.className}</p>
                                    </div>

                                    <div
                                        className="button change-prediction-button"
                                        onClick={() => setChangePredictionPopup(true)}
                                    >
                                        Change Prediction
                                    </div>
                                </div>

                                <div className="stretch-container">
                                    <div className="simple-grid">
                                        <p className="subheading">Prediction Date</p>
                                        <p className="stand-out">{predictedResults.date}</p>
                                    </div>
                                </div>

                                <div className="stretch-container">
                                    <div className="simple-grid">
                                        <p className="subheading">Prediction Explanation</p>
                                        <p className="stand-out" style={{ fontSize: "10px" }}>
                                            {gptResult}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </PopupBody>
                </Popup>
            )}

            {changePredictionPopup && (
                <Popup
                    title="Change Prediction"
                    onClose={() => setChangePredictionPopup(false)}
                >
                    <PopupBody>
                        <div className="popup-body change-prediction-body">
                            <div className="current-predition-container">
                                <p className="mini-title">Current Prediction:</p>
                                <p className="current-prediction-placeholder">
                                    {predictedResults.className}
                                </p>
                            </div>

                            <div className="change-to-container">
                                <p className="mini-title">Change to:</p>
                                <div className="change-to-options">
                                    {availableChoices.map((choice) => (
                                        <label key={choice} className="change-option">
                                            <input
                                                type="radio"
                                                name="radio"
                                                checked={selectedChoice === choice}
                                                onChange={() => {
                                                    setSelectedChoice(choice);
                                                    setChangeValidationError("");
                                                }}
                                            />
                                            {choice === predictedResults.className
                                                ? `${choice} (keep current prediction)`
                                                : choice}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="comment-container">
                                <p className="mini-title">Comment (Optional):</p>
                                <input
                                    className="comment"
                                    onChange={(e) => setUserComment(e.target.value)}
                                    value={userComment}
                                />
                            </div>

                            <p className="disclaimer">
                                The prediction value will be saved as your final choice and
                                the image will be available for admin review.
                            </p>

                            {changeValidationError && (
                                <p className="mandatory-change-message">{changeValidationError}</p>
                            )}

                            <button
                                className="button"
                                type="button"
                                onClick={confirmPredictionChanges}
                                disabled={changingPrediction}
                            >
                                {changingPrediction ? "Saving..." : "Confirm Changes"}
                            </button>
                        </div>

                        {changingPrediction && <Loader />}
                    </PopupBody>
                </Popup>
            )}
        </>
    );
}
