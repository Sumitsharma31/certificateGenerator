const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const Internship = require('../models/Internship');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');

// Get Learning Data (Curriculum + User Progress)
router.get('/:internshipId', protect, async (req, res) => {
    try {
        const { internshipId } = req.params;

        // Check enrollment
        const enrollment = await Enrollment.findOne({
            internshipId,
            userId: req.user.id,
            status: { $in: ['active', 'completed'] }
        });

        if (!enrollment) {
            return res.status(403).json({ error: 'Not enrolled or payment pending' });
        }

        const internship = await Internship.findById(internshipId)
            .select('title modules');

        // Logic to determine locked status
        // Module 0 is always unlocked.
        // Module N is unlocked if Module N-1 is Passed (in quizResults with passed: true)

        // We send back the raw modules and the progress, Frontend handles the locked UI based on this data.

        res.json({
            success: true,
            data: {
                internship,
                progress: enrollment.progress
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark Content as Read
router.post('/:internshipId/modules/:moduleId/complete', protect, async (req, res) => {
    try {
        const { internshipId, moduleId } = req.params;

        const enrollment = await Enrollment.findOne({
            internshipId,
            userId: req.user.id
        });

        if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

        // Add to completedModules if not already present
        if (!enrollment.progress.completedModules.includes(moduleId)) {
            enrollment.progress.completedModules.push(moduleId);
            await enrollment.save();
        }

        res.json({ success: true, progress: enrollment.progress });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Submit Quiz
router.post('/:internshipId/modules/:moduleId/quiz', protect, async (req, res) => {
    try {
        const { internshipId, moduleId } = req.params;
        const { answers } = req.body; // { questionIndex: optionIndex }

        const internship = await Internship.findById(internshipId);
        const module = internship.modules.id(moduleId);

        if (!module || !module.quiz || module.quiz.length === 0) {
            return res.status(400).json({ error: 'No quiz found for this module' });
        }

        let correctCount = 0;
        const totalQuestions = module.quiz.length;

        module.quiz.forEach((q, index) => {
            if (answers[index] === q.correctAnswer) {
                correctCount++;
            }
        });

        const percent = (correctCount / totalQuestions) * 100;
        const passed = percent >= 50;

        const enrollment = await Enrollment.findOne({
            internshipId,
            userId: req.user.id
        });

        // Update Quiz Results
        const existingResultIndex = enrollment.progress.quizResults.findIndex(r => r.moduleId === moduleId);
        if (existingResultIndex > -1) {
            // Keep best score or just update? Let's just update for now or keep passed if already passed.
            if (!enrollment.progress.quizResults[existingResultIndex].passed) {
                enrollment.progress.quizResults[existingResultIndex].score = percent;
                enrollment.progress.quizResults[existingResultIndex].passed = passed;
            }
            enrollment.progress.quizResults[existingResultIndex].attempts += 1;
        } else {
            enrollment.progress.quizResults.push({
                moduleId,
                score: percent,
                passed,
                attempts: 1
            });
        }

        // Check for Certificate Eligibility (All specific modules passed?)
        // For now, let's just save.

        // Update total percentage?
        const totalModules = internship.modules.length;
        // Simple logic: tasksCompleted could be quiz passed count
        const passedQuizzes = enrollment.progress.quizResults.filter(r => r.passed).length;
        const percentage = Math.round((passedQuizzes / totalModules) * 100);

        enrollment.progress.percentage = percentage;
        enrollment.progress.tasksCompleted = passedQuizzes;
        enrollment.progress.totalTasks = totalModules;

        if (percentage === 100 && enrollment.status !== 'completed') {
            enrollment.status = 'completed';
            enrollment.completedAt = new Date();
        }

        await enrollment.save();

        res.json({
            success: true,
            result: {
                score: percent,
                passed,
                correctCount,
                totalQuestions
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
