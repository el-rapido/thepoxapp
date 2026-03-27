import React from "react";
import Image from "next/image";
import "@/app/styles/collaborators.css";

const collaborators = [
    {
        name: "Prof. Dr. Tamer Sanlidag",
        imageName: "tamer.jpg",
    },
    {
        name: "Prof. Dr. Fadi Al-Turjman",
        imageName: "fadi.png",
    },
    {
        name: "Mr. Ibrahim Ame",
        imageName: "ibrahim.png",
    },
    {
        name: "Eda",
        imageName: "eda.jpg",
    },
    {
        name: "Serhan",
        imageName: "serhan.jpg",
    },
    {
        name: "Seyer",
        imageName: "seyer.jpg",
    },
];

export default function Collaborators() {
    return (
        <div className="collaborators-page">
            <div className="collaborators-title-block">
                <h1>Collaborators</h1>
                <p>Research and implementation contributors.</p>
            </div>

            <div className="collaborators-container">
                {collaborators.map((collaborator) => (
                    <div
                        key={collaborator.imageName}
                        className="collaborator-element-container"
                    >
                        <Image
                            src={`/collaborators/${collaborator.imageName}`}
                            alt={collaborator.name}
                            width={600}
                            height={600}
                        />
                        <div className="collaborator-details">
                            <p>{collaborator.name}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
