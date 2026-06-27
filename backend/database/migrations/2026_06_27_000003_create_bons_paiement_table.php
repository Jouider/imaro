<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bons de paiement résident (KAN-110 / #322).
 * Le résident émet un bon (statut en_attente) ; le syndic le valide après un
 * délai minimal de 24 h (validable_at). À la validation : ticket de suivi +
 * PDF téléchargeable. Tout est rattaché à un tenant / résidence / copropriétaire.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bons_paiement', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('residence_id');
            $table->unsignedBigInteger('coproprietaire_id');
            $table->string('reference', 30)->nullable();
            $table->string('compte_emetteur');           // texte libre (ex. "Compte chèque · 000335E…")
            $table->string('beneficiaire');
            $table->decimal('montant', 10, 2);
            $table->text('motif');
            $table->enum('statut', ['en_attente', 'valide', 'rejete', 'expire'])->default('en_attente');
            $table->timestamp('validable_at');           // now + 24 h : pas de validation avant (Art. délai 24 h)
            $table->timestamp('validated_at')->nullable();
            $table->unsignedBigInteger('valide_par')->nullable();
            $table->text('motif_rejet')->nullable();
            $table->unsignedBigInteger('ticket_id')->nullable(); // ticket de suivi généré à la validation
            $table->string('pdf_path')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('residence_id')->references('id')->on('residences')->cascadeOnDelete();
            $table->foreign('coproprietaire_id')->references('id')->on('coproprietaires')->cascadeOnDelete();
            $table->foreign('valide_par')->references('id')->on('users')->nullOnDelete();
            $table->foreign('ticket_id')->references('id')->on('tickets')->nullOnDelete();
            $table->unique('reference');
            $table->index(['tenant_id', 'residence_id', 'statut']);
            $table->index('coproprietaire_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bons_paiement');
    }
};
