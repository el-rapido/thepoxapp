"use client";

import React, { ChangeEvent, useState } from "react";
import { Popup, PopupBody, PopupFooter } from "@/app/components/Popup";
import "@/app/styles/main.css";
import "@/app/styles/reviewpopup.css";
import "@/app/styles/changePrediction.css";

import useFileUpload from "@/app/hooks/useFileUpload";
import Loader from "@/app/components/Loader/Loader";

const DOMAIN = "http://pox.carboncloud.pro";

const availableChoices = [
    "chickenpox",
    "acne",
    "monkeypox",
    "non-skin",
    "normal",
    "not-identified",
];

export default function Dashboard() {
    const [predictionPopup, setPredictionPopup] = useState(false);
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
    const [predictionRecordId, setPredictionRecordId] = useState<number | null>(
        null
    );
    const [mustConfirmPrediction, setMustConfirmPrediction] = useState(false);
    const [changeValidationError, setChangeValidationError] = useState("");

    const { uploadFile, isUploading } = useFileUpload();

    async function handleAskQuestion() {
        const prediction = predictedResults.className.trim();
        const question = userQuestion.trim();

        if (!prediction || !question) {
            alert("prediction or quesion fields are empty");
            return;
        }

        const result = await fetch("/api/askgpt", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                prediction,
                question,
                absoluteImageURL,
            }),
        });

        const returnText = await result.text();
        setGPTResult(returnText);
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
                headers: {
                    "Content-Type": "application/json",
                },
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
            if (!image) {
                return;
            }

            const uploadResult = await uploadFile(image);
            if (!uploadResult) {
                throw new Error("Image upload failed");
            }

            const fileName = uploadResult.filePath.split("/uploads/")[1];
            if (!fileName) {
                throw new Error("Could not determine the uploaded filename");
            }

            setIsPredicting(true);

            const prediction = await fetch("/api/predict", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ fileName }),
            });

            const predictionText = await prediction.text();

            if (!prediction.ok) {
                throw new Error(
                    predictionText ||
                        `Prediction API failed with status ${prediction.status}`
                );
            }

            let predictionData;
            try {
                predictionData = JSON.parse(predictionText);
            } catch (parseError) {
                console.error("Prediction JSON parse failed:", parseError);
                throw new Error(
                    "Prediction response could not be parsed as JSON"
                );
            }

            const predictionResults = predictionData?.classification;
            if (!predictionResults) {
                throw new Error("Prediction response is missing classification data");
            }

            setRegularFilename(fileName);
            setAbsoluteImageURL(`${DOMAIN}/uploads/${fileName}`);

            const accuracy = Number(predictionResults.max_prob);
            const predictedClass =
                accuracy < 0.65
                    ? "not-identified"
                    : predictionResults.predicted_class;

            setPredictedResults({
                className: predictedClass,
                date: new Date().toDateString(),
            });

            const predictionLogResponse = await fetch("/api/predictions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
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
            setMustConfirmPrediction(true);

            setImage(undefined);
            setPredictionPopup(false);
            setReviewPopup(true);
            setChangePredictionPopup(true);
        } catch (error) {
            console.error(error);
        } finally {
            setIsPredicting(false);
        }
    }

    function handlePredictingImageChange(event: ChangeEvent<HTMLInputElement>) {
        try {
            if (event.target.files) {
                const file = event.target.files[0];
                setImage(file);
                const url = URL.createObjectURL(file);
                setImageURL(url);
            }
        } catch (error) {
            setImageURL(undefined);
            setImage(undefined);
            console.error(error);
        }
    }

    async function confirmPredictionChanges() {
        const finalChoice = selectedChoice.trim();
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
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        fileName: regularFilename,
                        folderName: finalChoice,
                    }),
                });
            }

            if (predictionRecordId) {
                await fetch(`/api/predictions/${predictionRecordId}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        finalClass: finalChoice,
                    }),
                });
            }

            await commentOnImage(
                userComment,
                regularFilename,
                currentClassification,
                finalChoice,
                predictionRecordId
            );

            setPredictedResults((previous) => ({
                ...previous,
                className: finalChoice,
            }));

            setChangePredictionPopup(false);
            setMustConfirmPrediction(false);
        } catch (error) {
            console.error(error);
        } finally {
            setChangingPrediction(false);
        }
    }

    return (
        <>
            <div className="predict-button-container">
                <div className="button" onClick={() => setPredictionPopup(true)}>
                    Perform Skin Disease Prediction
                </div>
            </div>

            {predictionPopup && (
                <Popup
                    title="Predict Skin Disease"
                    onClose={() => {
                        setImage(undefined);
                        setImageURL(undefined);
                        setPredictionPopup(false);
                    }}
                >
                    <PopupBody size={{ height: "auto", width: "540px" }}>
                        <label
                            htmlFor="image-predict"
                            className="image-upload-wrapper"
                        >
                            {imageURL == undefined ? (
                                <div className="select-image">
                                    click here to select or take an image to
                                    predict
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
                                onChange={(event) =>
                                    handlePredictingImageChange(event)
                                }
                            />
                        </label>

                        {isUploading || (isPredicting && <Loader />)}
                    </PopupBody>

                    <PopupFooter>
                        <div className="button" onClick={startPrediction}>
                            start prediction
                        </div>
                    </PopupFooter>
                </Popup>
            )}

            {reviewPopup && (
                <Popup
                    title="Prediction Results"
                    closable={!mustConfirmPrediction}
                    onClose={() => {
                        if (mustConfirmPrediction) {
                            return;
                        }

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
                                        onChange={(e) =>
                                            setUserQuestion(e.target.value)
                                        }
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAskQuestion}
                                    >
                                        Ask AI
                                    </button>
                                </div>
                            </div>

                            <div className="image-view-details-wrapper">
                                <div className="stretch-container simple-grid">
                                    <div className="simple-grid">
                                        <p className="subheading">
                                            Prediction Result
                                        </p>
                                        <p className="stand-out">
                                            {predictedResults.className}
                                        </p>
                                    </div>

                                    <div
                                        className="button change-prediction-button"
                                        onClick={() =>
                                            setChangePredictionPopup(true)
                                        }
                                    >
                                        {mustConfirmPrediction
                                            ? "Finalize Prediction (Required)"
                                            : "Change Prediction"}
                                    </div>

                                    {mustConfirmPrediction && (
                                        <p className="mandatory-change-message">
                                            You must confirm the final prediction
                                            before closing this result.
                                        </p>
                                    )}
                                </div>

                                <div className="stretch-container">
                                    <div className="simple-grid">
                                        <p className="subheading">
                                            Prediction Date
                                        </p>
                                        <p className="stand-out">
                                            {predictedResults.date}
                                        </p>
                                    </div>
                                </div>

                                <div className="stretch-container">
                                    <div className="simple-grid">
                                        <p className="subheading">
                                            Prediction Explanation
                                        </p>
                                        <p
                                            className="stand-out"
                                            style={{ fontSize: "10px" }}
                                        >
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
                    closable={!mustConfirmPrediction}
                    onClose={() => {
                        if (mustConfirmPrediction) {
                            return;
                        }

                        setChangePredictionPopup(false);
                    }}
                >
                    <PopupBody>
                        <div className="popup-body change-prediction-body">
                            <div className="current-predition-container">
                                <p className="mini-title">
                                    Current Predicition:
                                </p>
                                <p className="current-prediction-placeholder">
                                    {predictedResults.className}
                                </p>
                            </div>

                            <div className="change-to-container">
                                <p className="mini-title">Change to:</p>
                                <div className="change-to-options">
                                    {availableChoices.map((choice) => (
                                        <label
                                            key={choice}
                                            className="change-option"
                                        >
                                            <input
                                                type="radio"
                                                name="radio"
                                                checked={
                                                    selectedChoice === choice
                                                }
                                                onChange={() => {
                                                    setSelectedChoice(choice);
                                                    setChangeValidationError("");
                                                }}
                                            />
                                            {choice ===
                                            predictedResults.className
                                                ? `${choice} (keep current prediction)`
                                                : choice}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="comment-container">
                                <p className="mini-title">
                                    Comment (Optional):
                                </p>
                                <input
                                    className="comment"
                                    onChange={(e) =>
                                        setUserComment(e.target.value)
                                    }
                                    value={userComment}
                                />
                            </div>
                            <p className="disclaimer">
                                The prediction value will be saved as your final
                                choice and the image will be available for admin
                                review.
                            </p>

                            {changeValidationError && (
                                <p className="mandatory-change-message">
                                    {changeValidationError}
                                </p>
                            )}

                            <button
                                className="button"
                                type="button"
                                onClick={confirmPredictionChanges}
                                disabled={changingPrediction}
                            >
                                {changingPrediction
                                    ? "Saving..."
                                    : "Confirm Changes"}
                            </button>
                        </div>

                        {changingPrediction && <Loader />}
                    </PopupBody>
                </Popup>
            )}
        </>
    );
}
