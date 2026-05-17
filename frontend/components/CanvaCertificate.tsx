'use client'

import { QRCodeSVG } from 'qrcode.react'

interface Props {
    userName: string
    courseName: string
    startDate: string
    endDate: string
    certId: string
    issuedDate: string
}

export default function CanvaCertificate({
    userName,
    courseName,
    startDate,
    endDate,
    certId,
    issuedDate,
}: Props) {
    const verificationUrl =
        typeof window !== 'undefined'
            ? `${window.location.origin}/certificates/verify/${certId}`
            : ''

    return (
        <div
            id="certificate"
            className="relative mx-auto bg-white"
            style={{ width: '1123px', height: '794px' }}
        >
            {/* ================= BASE CANVA IMAGE ================= */}
            <img
                src="/certificates/internship-template.png"
                alt="Certificate Template"
                className="absolute inset-0 w-full h-full"
            />

            {/* ================= STUDENT NAME ================= */}
            <div
                style={{
                    position: 'absolute',
                    top: '287px',
                    left: '79px',
                    width: '964px',
                    fontSize: '68px',
                    fontFamily: 'Cormorant Garamond',
                    fontWeight: '600',
                    color: '#d6b25e',
                    textAlign: 'center',
                }}
            >
                {userName}
            </div>

            {/* ================= OBJECTIVES / COURSE ================= */}
            <div
                style={{
                    position: 'absolute',
                    top: '434px',
                    left: '117px',
                    width: '856px',
                    fontSize: '20px',
                    fontFamily: 'Glacial Indifference',
                    color: '#1e3a5f',
                    textAlign: 'center',
                    lineHeight: '1.5',
                }}
            >
                for successfully completing a <strong>of internship</strong>,
                leveraging skills Builds & IBM Cloud platform in{' '}
                <strong>{courseName}</strong> from{' '}
                <strong>{startDate}</strong> to <strong>{endDate}</strong>.
                This program was conducted by <strong>Certify-Now</strong> in
                collaboration with <strong>AICTE</strong>.
            </div>

            {/* ================= CERTIFICATE ID ================= */}
            <div
                style={{
                    position: 'absolute',
                    top: '718px',
                    left: '34px',
                    width: '1041px',
                    fontSize: '12px',
                    fontFamily: 'Glacial Indifference',
                    color: '#1e3a5f',
                    textAlign: 'center',
                }}
            >
                Certificate-ID : {certId}
            </div>

            {/* ================= VERIFICATION LINK ================= */}
            <div
                style={{
                    position: 'absolute',
                    top: '741px',
                    left: '397px',
                    width: '329px',
                    fontSize: '12px',
                    fontFamily: 'Glacial Indifference',
                    color: '#1e3a5f',
                }}
            >
                Verification-link : {verificationUrl}
            </div>

            {/* ================= QR CODE (SECOND POSITION) ================= */}
            <div
                style={{
                    position: 'absolute',
                    top: '675px',
                    left: '870px',
                }}
            >
                <div className="bg-white p-1 rounded">
                    <QRCodeSVG
                        value={verificationUrl}
                        size={80}
                        level="H"
                        includeMargin={false}
                    />
                </div>
            </div>

            {/* ================= DATE OF ISSUE ================= */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '145px',
                    right: '190px',
                    fontSize: '12px',
                    fontFamily: 'Glacial Indifference',
                    color: '#1e3a5f',
                    textAlign: 'center',
                }}
            >


                {issuedDate}
            </div>
        </div>
    )
}
