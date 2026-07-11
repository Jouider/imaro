<?php

use App\Http\Controllers\Api\Gestionnaire\AnnexeController;
use App\Http\Controllers\Api\Gestionnaire\AnnonceController;
use App\Http\Controllers\Api\Gestionnaire\AppelFondsController;
use App\Http\Controllers\Api\Gestionnaire\AssembleeController;
use App\Http\Controllers\Api\Gestionnaire\AssistanceRecouvrementController;
use App\Http\Controllers\Api\Gestionnaire\AssistantController;
use App\Http\Controllers\Api\Gestionnaire\AuditLogController;
use App\Http\Controllers\Api\Gestionnaire\AutreRecetteController;
use App\Http\Controllers\Api\Gestionnaire\BilanOuvertureController;
use App\Http\Controllers\Api\Gestionnaire\BudgetAnnexe5Controller;
use App\Http\Controllers\Api\Gestionnaire\BudgetController;
use App\Http\Controllers\Api\Gestionnaire\CategorieLotController;
use App\Http\Controllers\Api\Gestionnaire\ComplianceCalendarController;
use App\Http\Controllers\Api\Gestionnaire\ComptabiliteController;
use App\Http\Controllers\Api\Gestionnaire\ComptabiliteExportController;
use App\Http\Controllers\Api\Gestionnaire\CompteBancaireController;
use App\Http\Controllers\Api\Gestionnaire\ContratController;
use App\Http\Controllers\Api\Gestionnaire\CoproprietaireController;
use App\Http\Controllers\Api\Gestionnaire\CreanceController;
use App\Http\Controllers\Api\Gestionnaire\DashboardController;
use App\Http\Controllers\Api\Gestionnaire\DecompteController;
use App\Http\Controllers\Api\Gestionnaire\DepenseFinanceController;
use App\Http\Controllers\Api\Gestionnaire\DocumentController;
use App\Http\Controllers\Api\Gestionnaire\EmpruntController;
use App\Http\Controllers\Api\Gestionnaire\EncaissementController;
use App\Http\Controllers\Api\Gestionnaire\EquipementController;
use App\Http\Controllers\Api\Gestionnaire\EquipePersonnelController;
use App\Http\Controllers\Api\Gestionnaire\EquipeUtilisateurController;
use App\Http\Controllers\Api\Gestionnaire\ExerciceController;
use App\Http\Controllers\Api\Gestionnaire\GroupeHabitationController;
use App\Http\Controllers\Api\Gestionnaire\ImmeubleController;
use App\Http\Controllers\Api\Gestionnaire\ImpayeController;
use App\Http\Controllers\Api\Gestionnaire\LotController;
use App\Http\Controllers\Api\Gestionnaire\NotificationController;
use App\Http\Controllers\Api\Gestionnaire\OccupantController;
use App\Http\Controllers\Api\Gestionnaire\OnboardingController;
use App\Http\Controllers\Api\Gestionnaire\PaiementController;
use App\Http\Controllers\Api\Gestionnaire\PenaltyController;
use App\Http\Controllers\Api\Gestionnaire\PointageController;
use App\Http\Controllers\Api\Gestionnaire\PrestataireController;
use App\Http\Controllers\Api\Gestionnaire\ProfilController;
use App\Http\Controllers\Api\Gestionnaire\RecouvrementController;
use App\Http\Controllers\Api\Gestionnaire\RelanceScenarioController;
use App\Http\Controllers\Api\Gestionnaire\RemboursementController;
use App\Http\Controllers\Api\Gestionnaire\ResidenceController;
use App\Http\Controllers\Api\Gestionnaire\TicketController;
use App\Http\Controllers\Api\Gestionnaire\TicketSlaConfigController;
use App\Http\Controllers\Api\Gestionnaire\TravauxExceptionnelController;
use App\Http\Controllers\Api\Gestionnaire\VirementDeclareController;
use App\Http\Controllers\Api\Gestionnaire\VisiteController;
use Illuminate\Support\Facades\Route;

// Dashboard
Route::get('/dashboard', [DashboardController::class, 'index']);

// Assistant EMARO — FAQ syndic (KAN-107)
Route::get('/assistant/faq', [AssistantController::class, 'faq']);

// Assistance recouvrement (service optionnel — demande d'accompagnement) — #179
Route::post('/assistance-recouvrement', [AssistanceRecouvrementController::class, 'store']);

// Résidences + lots + copropriétaires + exercices (KAN-13 + issue #95)
Route::apiResource('residences', ResidenceController::class)
    ->only(['index', 'show', 'store', 'update', 'destroy']);

Route::prefix('residences/{residence}')->group(function () {
    Route::get('/overview', [ResidenceController::class, 'overview']);
    Route::get('/lots', [LotController::class, 'index']);
    Route::post('/lots', [LotController::class, 'store']);
    Route::post('/lots/bulk', [LotController::class, 'bulkStore']);
    // Catégories de lot (KAN-93 — mode cotisation « par catégorie »)
    Route::get('/categories-lot', [CategorieLotController::class, 'index']);
    Route::post('/categories-lot', [CategorieLotController::class, 'store']);
    Route::put('/lots/{lot}', [LotController::class, 'update']);
    Route::delete('/lots/{lot}', [LotController::class, 'destroy']);
    Route::post('/import-soldes', [LotController::class, 'importSoldes']);
    Route::post('/import-paiements', [LotController::class, 'importPaiements']);
    Route::get('/coproprietaires', [CoproprietaireController::class, 'index']);
    // Comptes bancaires (Art. 26 — compte séparé par syndicat)
    Route::get('/comptes-bancaires', [CompteBancaireController::class, 'index']);
    Route::post('/comptes-bancaires', [CompteBancaireController::class, 'store']);
    Route::put('/comptes-bancaires/{compte}', [CompteBancaireController::class, 'update']);
    Route::delete('/comptes-bancaires/{compte}', [CompteBancaireController::class, 'destroy']);
    Route::post('/comptes-bancaires/{compte}/primary', [CompteBancaireController::class, 'setPrimary']);
    // Exercices
    Route::get('/exercices', [ExerciceController::class, 'index']);
    Route::post('/exercices', [ExerciceController::class, 'store']);
    Route::post('/exercices/{exercice}/cloture', [ExerciceController::class, 'cloture']);
    // KAN-87 — scénario de relance de recouvrement (config par résidence)
    Route::get('/relance-scenario', [RelanceScenarioController::class, 'show']);
    Route::put('/relance-scenario', [RelanceScenarioController::class, 'update']);
    // Budget Annexe 5 (per exercice)
    Route::get('/exercices/{exercice}/budget-annexe5', [BudgetAnnexe5Controller::class, 'show']);
    Route::get('/exercices/{exercice}/budget', [BudgetAnnexe5Controller::class, 'showSimple']);
    // Groupes d'habitation (GH / tranches) — optionnel
    Route::get('/groupes-habitations', [GroupeHabitationController::class, 'index']);
    Route::post('/groupes-habitations', [GroupeHabitationController::class, 'store']);
    Route::put('/groupes-habitations/{groupeHabitation}', [GroupeHabitationController::class, 'update']);
    Route::delete('/groupes-habitations/{groupeHabitation}', [GroupeHabitationController::class, 'destroy']);
    // Immeubles
    Route::get('/immeubles', [ImmeubleController::class, 'index']);
    Route::post('/immeubles', [ImmeubleController::class, 'store']);
    Route::put('/immeubles/{immeuble}', [ImmeubleController::class, 'update']);
    Route::delete('/immeubles/{immeuble}', [ImmeubleController::class, 'destroy']);
});

// Lots par immeuble
Route::get('/immeubles/{immeuble}/lots', [ImmeubleController::class, 'lots']);

// Lots — routes plates pour PUT/DELETE (attendues par le frontend)
Route::put('/lots/{lot}', [LotController::class, 'updateFlat']);
Route::delete('/lots/{lot}', [LotController::class, 'destroyFlat']);

// Catégories de lot — modification / suppression (KAN-93)
Route::put('/categories-lot/{categorie}', [CategorieLotController::class, 'update']);
Route::delete('/categories-lot/{categorie}', [CategorieLotController::class, 'destroy']);

// Copropriétaires — liste globale + création + import bulk + code d'accès
Route::middleware(['app.permission:coproprietaires'])->group(function () {
    Route::get('/coproprietaires', [CoproprietaireController::class, 'indexGlobal']);
    Route::post('/coproprietaires/bulk', [CoproprietaireController::class, 'bulkStore']);
    Route::post('/coproprietaires', [CoproprietaireController::class, 'store']);
    Route::post('/coproprietaires/{coproprietaire}/generate-code', [CoproprietaireController::class, 'generateCode']);
});

// Appels de fonds (KAN-14)
Route::middleware(['app.permission:finances'])->group(function () {
    Route::apiResource('appels-fonds', AppelFondsController::class)
        ->only(['index', 'store', 'show', 'update'])
        ->parameters(['appels-fonds' => 'appelFonds']);
    Route::post('appels-fonds/{appelFonds}/envoyer', [AppelFondsController::class, 'envoyer']);
});

// Paiements + impayés (KAN-15)
Route::middleware(['app.permission:finances'])->group(function () {
    Route::get('/paiements', [PaiementController::class, 'index']);
    Route::post('/paiements', [PaiementController::class, 'store']);
    // KAN-85 — marquer un chèque comme impayé (rejet bancaire)
    Route::post('/paiements/{paiement}/cheque-impaye', [PaiementController::class, 'chequeImpaye']);
});
Route::middleware(['app.permission:recouvrement,finances'])->group(function () {
    Route::get('/impayes', [ImpayeController::class, 'index']);
});

// Tickets (KAN-21)
// KAN-89 — config SLA des tickets (rappel auto par gravité). Avant la resource
// pour que /tickets/sla-config ne soit pas capté par /tickets/{ticket}.
Route::get('tickets/sla-config', [TicketSlaConfigController::class, 'show']);
Route::put('tickets/sla-config', [TicketSlaConfigController::class, 'update']);

Route::apiResource('tickets', TicketController::class)->only(['index', 'store', 'show', 'update']);
Route::post('tickets/{ticket}/clos', [TicketController::class, 'clos']);
// KAN-88 — assignation d'un ticket à un gestionnaire
Route::patch('tickets/{ticket}/assign', [TicketController::class, 'assign']);

// Visites — laissez-passer QR (KAN-102, cf. brief Visites)
Route::get('/residences/{residence}/visites', [VisiteController::class, 'index']);
Route::get('/residences/{residence}/visites/stats', [VisiteController::class, 'stats']);
Route::post('/residences/{residence}/visites', [VisiteController::class, 'store']);
Route::post('/visites/{visite}/cancel', [VisiteController::class, 'cancel']);

// Assemblées (Sprint 2)
Route::middleware(['app.permission:assemblees'])->group(function () {
    Route::get('/assemblees', [AssembleeController::class, 'index']);
    Route::post('/assemblees', [AssembleeController::class, 'store']);
    // Convocations AG (KAN-98 / #269) — génération async + PDF fusionné
    Route::post('/assemblees/{assemblee}/convocations', [AssembleeController::class, 'genererConvocations']);
    Route::get('/assemblees/{assemblee}/convocations', [AssembleeController::class, 'convocations']);

    // Annonces
    Route::get('/annonces', [AnnonceController::class, 'index']);
    Route::post('/annonces', [AnnonceController::class, 'store']);
    Route::put('/annonces/{annonce}', [AnnonceController::class, 'update']);
    Route::post('/annonces/{annonce}/publier', [AnnonceController::class, 'publier']);
    Route::post('/annonces/{annonce}/archiver', [AnnonceController::class, 'archiver']);
    Route::delete('/annonces/{annonce}', [AnnonceController::class, 'destroy']);
});

// Prestataires + Contrats (Sprint 2)
Route::get('/prestataires', [PrestataireController::class, 'index']);
Route::post('/prestataires/bulk', [PrestataireController::class, 'bulkStore']);
Route::post('/prestataires', [PrestataireController::class, 'store']);
Route::put('/prestataires/{prestataire}', [PrestataireController::class, 'update']);
Route::delete('/prestataires/{prestataire}', [PrestataireController::class, 'destroy']);

Route::get('/contrats', [ContratController::class, 'index']);
Route::post('/contrats', [ContratController::class, 'store']);

// Budgets + Postes budgétaires (Sprint 2)
Route::middleware(['app.permission:finances'])->group(function () {
    Route::get('/budgets', [BudgetController::class, 'index']);
    Route::post('/budgets', [BudgetController::class, 'store']);
    Route::post('/budgets/{budget}/approuver', [BudgetController::class, 'approuver']);
    Route::post('/budgets/{budget}/postes', [BudgetController::class, 'storePoste']);
    Route::put('/budgets/{budget}/postes/{poste}', [BudgetController::class, 'updatePoste']);
    Route::delete('/budgets/{budget}/postes/{poste}', [BudgetController::class, 'destroyPoste']);
    Route::put('/budgets/postes/{poste}', [BudgetController::class, 'updatePosteFlat']);
    Route::delete('/budgets/postes/{poste}', [BudgetController::class, 'destroyPosteFlat']);
    // Budget Annexe 5 — Lignes + actions
    Route::post('/budgets/{budget}/lignes', [BudgetAnnexe5Controller::class, 'storeLigne']);
    Route::put('/budgets/{budget}/lignes/bulk', [BudgetAnnexe5Controller::class, 'bulkUpdateLignes']);
    Route::put('/budgets/lignes/{ligne}', [BudgetAnnexe5Controller::class, 'updateLigne']);
    Route::delete('/budgets/lignes/{ligne}', [BudgetAnnexe5Controller::class, 'destroyLigne']);
    Route::post('/budgets/{budget}/soumettre-ag', [BudgetAnnexe5Controller::class, 'soumettreAg']);
    Route::post('/budgets/{budget}/verrouiller', [BudgetAnnexe5Controller::class, 'verrouiller']);
    Route::get('/budgets/{budget}/simulation', [BudgetAnnexe5Controller::class, 'simulation']);
    Route::get('/budgets/{budget}/suggestions-ia', [BudgetAnnexe5Controller::class, 'suggestionsIa']);
});

// Documents (Sprint 2)
Route::middleware(['app.permission:documents'])->group(function () {
    Route::get('/documents', [DocumentController::class, 'index']);
    Route::post('/documents', [DocumentController::class, 'store']);
    Route::delete('/documents/{document}', [DocumentController::class, 'destroy']);
});

// Profil gestionnaire
Route::get('/profil', [ProfilController::class, 'show']);
Route::patch('/profil', [ProfilController::class, 'update']);
Route::post('/profil/logo', [ProfilController::class, 'uploadLogo']);

// Notifications
Route::get('/notifications', [NotificationController::class, 'index']);
Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy']);

// Comptabilité — exercice-scoped endpoints
Route::middleware(['app.permission:finances,depenses'])->prefix('exercices/{exercice}')->group(function () {
    Route::get('/dashboard', [ComptabiliteController::class, 'dashboard']);
    Route::get('/journal', [ComptabiliteController::class, 'journal']);
    Route::get('/grand-livre', [ComptabiliteController::class, 'grandLivre']);
    Route::get('/balance', [ComptabiliteController::class, 'balance']);
    Route::get('/depenses', [ComptabiliteController::class, 'depensesIndex']);
    Route::post('/depenses', [ComptabiliteController::class, 'depensesStore']);
    Route::delete('/depenses/{depense}', [ComptabiliteController::class, 'depensesDestroy']);
    Route::post('/encaissements', [ComptabiliteController::class, 'storeEncaissement']);
    Route::post('/cloturer', [ComptabiliteController::class, 'cloturer']);
});

// Comptes PCG (référentiel statique)
Route::get('/comptes-pcg', [ComptabiliteController::class, 'comptesPcg']);

// ========================================
// Sprint 4 — Conformité légale
// ========================================

// Audit trail
Route::get('/audit-logs', [AuditLogController::class, 'index']);
Route::get('/audit-logs/export', [AuditLogController::class, 'export']);

// Occupants (per lot)
Route::get('/lots/{lot}/occupants', [OccupantController::class, 'index']);
Route::post('/lots/{lot}/occupants', [OccupantController::class, 'store']);
Route::put('/occupants/{occupant}', [OccupantController::class, 'update']);
Route::delete('/occupants/{occupant}', [OccupantController::class, 'destroy']);

// Résidence-scoped Sprint 4 routes
Route::prefix('residences/{residence}')->group(function () {
    // Occupants agrégés par résidence
    Route::get('/occupants', [OccupantController::class, 'indexByResidence']);

    // Penalty config
    Route::get('/penalty-config', [PenaltyController::class, 'show']);
    Route::put('/penalty-config', [PenaltyController::class, 'update']);
    Route::post('/penalties/recalculate', [PenaltyController::class, 'recalculate']);

    // Recouvrement (prescription risks)
    Route::get('/recouvrement', [RecouvrementController::class, 'index']);

    // Compliance calendar
    Route::get('/compliance-calendar', [ComplianceCalendarController::class, 'index']);

    // Annexes
    Route::get('/annexes', [AnnexeController::class, 'index']);
    Route::get('/annexes/{annexeNum}', [AnnexeController::class, 'show']);
    Route::post('/annexes/{annexeNum}/regenerate', [AnnexeController::class, 'regenerate']);

    // Bilan d'ouverture
    Route::get('/bilan-ouverture', [BilanOuvertureController::class, 'index']);
    Route::post('/bilan-ouverture/bulk', [BilanOuvertureController::class, 'bulkStore']);
});

// Compliance tasks actions
Route::post('/compliance-tasks/{task}/complete', [ComplianceCalendarController::class, 'complete']);
Route::post('/compliance-tasks/{task}/skip', [ComplianceCalendarController::class, 'skip']);

// Mise en demeure (per paiement)
Route::post('/paiements/{paiement}/mise-en-demeure', [PenaltyController::class, 'miseEnDemeure']);

// ========================================
// Sprint 7 — Patrimoine + Recettes/Remboursements
// ========================================

// Équipements (Annexe 9) — patrimoine, non sensible, pas de gate
Route::prefix('residences/{residence}')->group(function () {
    Route::get('/equipements', [EquipementController::class, 'index']);
    Route::post('/equipements', [EquipementController::class, 'store']);
});
Route::put('/equipements/{equipement}', [EquipementController::class, 'update']);
Route::delete('/equipements/{equipement}', [EquipementController::class, 'destroy']);

// Finances — emprunts, travaux exceptionnels, autres recettes, remboursements
Route::middleware(['app.permission:finances'])->group(function () {
    Route::prefix('residences/{residence}')->group(function () {
        Route::get('/emprunts', [EmpruntController::class, 'index']);
        Route::post('/emprunts', [EmpruntController::class, 'store']);

        Route::get('/travaux-exceptionnels', [TravauxExceptionnelController::class, 'index']);
        Route::post('/travaux-exceptionnels', [TravauxExceptionnelController::class, 'store']);

        Route::get('/autres-recettes', [AutreRecetteController::class, 'index']);
        Route::post('/autres-recettes', [AutreRecetteController::class, 'store']);

        Route::get('/remboursements', [RemboursementController::class, 'index']);
        Route::post('/remboursements', [RemboursementController::class, 'store']);
    });

    Route::put('/emprunts/{emprunt}', [EmpruntController::class, 'update']);
    Route::delete('/emprunts/{emprunt}', [EmpruntController::class, 'destroy']);
    Route::put('/travaux-exceptionnels/{travauxExceptionnel}', [TravauxExceptionnelController::class, 'update']);
    Route::delete('/travaux-exceptionnels/{travauxExceptionnel}', [TravauxExceptionnelController::class, 'destroy']);
    Route::put('/autres-recettes/{autreRecette}', [AutreRecetteController::class, 'update']);
    Route::delete('/autres-recettes/{autreRecette}', [AutreRecetteController::class, 'destroy']);
    Route::put('/remboursements/{remboursement}', [RemboursementController::class, 'update']);
    Route::delete('/remboursements/{remboursement}', [RemboursementController::class, 'destroy']);
});

// ========================================
// Sprint 6 — Pointage bancaire (gated: finances)
// ========================================

Route::middleware(['app.permission:finances'])->prefix('residences/{residence}/pointage')->group(function () {
    Route::post('/sessions', [PointageController::class, 'createSession']);
    Route::get('/sessions/{session}/candidates', [PointageController::class, 'candidates']);
    Route::post('/sessions/{session}/matches/confirm', [PointageController::class, 'confirmMatches']);
});

// ========================================
// Alias routes — frontend compatibility
// ========================================

// Frontend calls /comptabilite/comptes-pcg but backend has /comptes-pcg
Route::get('/comptabilite/comptes-pcg', [ComptabiliteController::class, 'comptesPcg']);

// Frontend calls /comptabilite/exercices/{id}/... but backend has /exercices/{id}/...
Route::prefix('comptabilite/exercices/{exercice}')->group(function () {
    Route::get('/dashboard', [ComptabiliteController::class, 'dashboard']);
    Route::get('/journal', [ComptabiliteController::class, 'journal']);
    Route::get('/grand-livre', [ComptabiliteController::class, 'grandLivre']);
    Route::get('/grand-livre/{compte}', [ComptabiliteController::class, 'grandLivre']);
    Route::get('/balance', [ComptabiliteController::class, 'balance']);
    Route::get('/depenses', [ComptabiliteController::class, 'depensesIndex']);
    Route::post('/depenses', [ComptabiliteController::class, 'depensesStore']);
    Route::delete('/depenses/{depense}', [ComptabiliteController::class, 'depensesDestroy']);
    Route::post('/encaissements', [ComptabiliteController::class, 'storeEncaissement']);
    Route::get('/encaissements', [ComptabiliteController::class, 'encaissementsIndex']);
    Route::post('/cloture', [ComptabiliteController::class, 'cloturer']);

    // Exports comptables (KAN-100) — fichiers téléchargeables
    Route::get('/export/journal.xlsx', [ComptabiliteExportController::class, 'journalXlsx']);
    Route::get('/export/grand-livre.xlsx', [ComptabiliteExportController::class, 'grandLivreXlsx']);
    Route::get('/export/fec', [ComptabiliteExportController::class, 'fec']);
    Route::get('/export/journal.pdf', [ComptabiliteExportController::class, 'journalPdf']);
    Route::get('/export/balance.pdf', [ComptabiliteExportController::class, 'balancePdf']);
});

// Frontend calls /residences/{id}/comptabilite/exercices
Route::get('/residences/{residence}/comptabilite/exercices', [ExerciceController::class, 'index']);
Route::post('/residences/{residence}/comptabilite/exercices', [ExerciceController::class, 'store']);

// Créances (frontend calls /creances)
Route::middleware(['app.permission:recouvrement,finances'])->group(function () {
    Route::get('/creances', [CreanceController::class, 'index']);
    Route::post('/creances/{id}/relancer', [CreanceController::class, 'relancer']);
    Route::post('/creances/relancer-tout', [CreanceController::class, 'relancerTout']);
});

// Dépenses finance (frontend calls /depenses-finance)
Route::middleware(['app.permission:depenses,finances'])->group(function () {
    Route::get('/depenses-finance', [DepenseFinanceController::class, 'index']);
    Route::post('/depenses-finance', [DepenseFinanceController::class, 'store']);
    Route::get('/depenses-finance/stats', [DepenseFinanceController::class, 'stats']);
    Route::get('/depenses-finance/recurrentes', [DepenseFinanceController::class, 'recurrentes']);
    Route::post('/depenses-finance/recurrentes', [DepenseFinanceController::class, 'storeRecurrente']);
    Route::post('/depenses-finance/import-ia', [DepenseFinanceController::class, 'importIa']);
    Route::post('/depenses-finance/recurrentes/{id}/toggle', [DepenseFinanceController::class, 'toggleRecurrente']);
    Route::post('/depenses-finance/{depense}/approuver', [DepenseFinanceController::class, 'approuver']);
    Route::post('/depenses-finance/{depense}/rejeter', [DepenseFinanceController::class, 'rejeter']);
    Route::delete('/depenses-finance/{depense}', [DepenseFinanceController::class, 'destroy']);
});

// Encaissements (paiements.service.ts)
Route::middleware(['app.permission:finances'])->group(function () {
    Route::get('/encaissements', [EncaissementController::class, 'index']);
    Route::post('/encaissements', [EncaissementController::class, 'store']);

    // Virements déclarés
    Route::get('/virements-declares', [VirementDeclareController::class, 'index']);
    Route::post('/virements-declares/{id}/valider', [VirementDeclareController::class, 'valider']);
    Route::post('/virements-declares/{id}/rejeter', [VirementDeclareController::class, 'rejeter']);

    // Décompte copropriétaire
    Route::get('/decomptes/{coproprietaire}', [DecompteController::class, 'show']);
});

// Flat delete for comptabilite depenses (frontend uses /comptabilite/depenses/{id})
Route::delete('/comptabilite/depenses/{depense}', [ComptabiliteController::class, 'depensesDestroy']);

// Import IA comptabilite
Route::post('/comptabilite/exercices/{exercice}/import-ia', [ComptabiliteController::class, 'importIa']);

// ========================================
// Onboarding wizard (manager-only — enforced in controller)
// ========================================

Route::patch('/onboarding', [OnboardingController::class, 'update']);
Route::post('/onboarding/complete', [OnboardingController::class, 'complete']);

// ========================================
// Équipe — utilisateurs app + personnel terrain
// ========================================

Route::middleware(['app.permission:personnel'])->group(function () {
    Route::get('/equipe/utilisateurs', [EquipeUtilisateurController::class, 'index']);
    Route::post('/equipe/utilisateurs', [EquipeUtilisateurController::class, 'store']);
    Route::put('/equipe/utilisateurs/{id}', [EquipeUtilisateurController::class, 'update']);
    Route::delete('/equipe/utilisateurs/{id}', [EquipeUtilisateurController::class, 'destroy']);

    Route::get('/equipe/personnel', [EquipePersonnelController::class, 'index']);
    Route::post('/equipe/personnel', [EquipePersonnelController::class, 'store']);
    Route::post('/equipe/personnel/{id}/send-code', [EquipePersonnelController::class, 'sendCode']);
    Route::put('/equipe/personnel/{id}', [EquipePersonnelController::class, 'update']);
    Route::delete('/equipe/personnel/{id}', [EquipePersonnelController::class, 'destroy']);
});
