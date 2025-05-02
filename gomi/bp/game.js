const TRASH_TYPES = [
    { key: ['metal_trash', 'metal1_trash', 'metal2_trash'], bin: 'metal_bin', magnet: 'metal_magnet', type: 'metal' },
    { key: ['plastic_trash', 'plastic1_trash', 'plastic2_trash'], bin: 'plastic_bin', magnet: 'plastic_magnet', type: 'plastic' },
    { key: ['bio_trash', 'bio1_trash', 'bio2_trash'], bin: 'bio_bin', magnet: 'bio_magnet', type: 'bio' }
];

class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    preload() {
        this.load.image('bg_street', 'images/bg_street.png');
        this.load.image('bg_city', 'images/bg_city.png');
        this.load.image('bg_park', 'images/bg_park.png');
        this.load.image('magnet', 'images/magnet.png');
        this.load.image('metal_magnet', 'images/metal_magnet.png');
        this.load.image('plastic_magnet', 'images/plastic_magnet.png');
        this.load.image('bio_magnet', 'images/bio_magnet.png');
        this.load.image('metal_trash', 'images/metal_trash.png');
        this.load.image('metal1_trash', 'images/metal1_trash.png');
        this.load.image('metal2_trash', 'images/metal2_trash.png');
        this.load.image('plastic_trash', 'images/plastic_trash.png');
        this.load.image('plastic1_trash', 'images/plastic1_trash.png');
        this.load.image('plastic2_trash', 'images/plastic2_trash.png');
        this.load.image('bio_trash', 'images/bio_trash.png');
        this.load.image('bio1_trash', 'images/bio1_trash.png');
        this.load.image('bio2_trash', 'images/bio2_trash.png');
        this.load.image('metal_bin', 'images/metal_bin.png');
        this.load.image('plastic_bin', 'images/plastic_bin.png');
        this.load.image('bio_bin', 'images/bio_bin.png');
    }

    create() {
        // Level backgrounds
        this.levels = [
            { bg: 'bg_street', trashRate: 2000 },
            { bg: 'bg_city', trashRate: 1400 },
            { bg: 'bg_park', trashRate: 900 },
            { bg: 'bg_street', trashRate: 800 },
            { bg: 'bg_city', trashRate: 700 },
            { bg: 'bg_park', trashRate: 600 },
            { bg: 'bg_street', trashRate: 500 },
            { bg: 'bg_city', trashRate: 400 },
            { bg: 'bg_park', trashRate: 350 }
        ];
        this.currentLevel = 0;
        this.score = 0;
        this.strikes = 0;
        this.timeLeft = 90; // Increase time per level
        this.magnetMode = 0; // 0: metal, 1: plastic, 2: bio
        this.heldTrash = null;
        this.trashGroup = this.physics.add.group();
        // Adjust background for much wider screen
        this.bg = this.add.image(800, 300, this.levels[this.currentLevel].bg).setDisplaySize(1600, 600);
        // Bins - spread out for wider screen
        this.bins = [];
        for (let i = 0; i < 3; i++) {
            const binX = 400 + i * 400;
            const binType = TRASH_TYPES[i];
            const bin = this.physics.add.staticImage(binX, 560, binType.bin);
            bin.trashType = binType.type;
            this.bins.push(bin);
        }
        // Magnet
        this.magnet = this.physics.add.sprite(800, 80, TRASH_TYPES[this.magnetMode].magnet);
        this.magnet.setCollideWorldBounds(true);
        this.magnet.body.allowGravity = false;
        // Input
        this.input.on('pointermove', pointer => {
            this.magnet.x = Phaser.Math.Clamp(pointer.x, 60, 1540);
        });
        this.input.mouse.disableContextMenu();
        this.input.on('pointerdown', (pointer) => {
            // Only trigger if pointer is over the game canvas, not UI
            if (pointer.leftButtonDown() && pointer.y < this.sys.game.config.height) {
                this.attractTrash();
            }
            if (pointer.rightButtonDown() && pointer.y < this.sys.game.config.height) {
                this.switchMagnetMode();
            }
        });
        this.input.keyboard.on('keydown-SPACE', () => this.dropTrash());
        // Timer
        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
        // Trash spawn control
        this.nextTrashTime = 0;
        this.trashSpawnMin = 1200;
        this.trashSpawnMax = 1800;
        this.trashSpawnGap = 250; // Increase gap to ensure no trash spawns above magnet
        this.stageTrashCount = [10, 12, 14, 16, 18, 20, 22, 24, 26]; // Number of trash per stage
        this.spawnedTrash = 0;
        this.spawningStopped = false;
        // Set all trash display size to exactly 100x100 pixels
        this.trashTargetWidth = 100;
        this.trashTargetHeight = 100;
        // UI
        this.updateUI();

        this.winLoseText = this.add.text(800, 300, '', {
            fontSize: '48px',
            color: '#fff',
            fontStyle: 'bold',
            backgroundColor: '#222a',
            padding: { x: 20, y: 10 },
            align: 'center'
        }).setOrigin(0.5).setDepth(10).setVisible(false);
    }

    attractTrash() {
        if (this.heldTrash) return;
        const modeType = TRASH_TYPES[this.magnetMode].type;
        // Find the closest trash of the correct type (no distance limit)
        let closest = null;
        let minDist = Number.MAX_SAFE_INTEGER;
        this.trashGroup.getChildren().forEach(trash => {
            if (trash.trashType === modeType) {
                const dist = Phaser.Math.Distance.Between(this.magnet.x, this.magnet.y, trash.x, trash.y);
                if (dist < minDist) {
                    minDist = dist;
                    closest = trash;
                }
            }
        });
        if (closest) {
            this.tweens.add({
                targets: closest,
                x: this.magnet.x,
                y: this.magnet.y + 40,
                duration: 300,
                onComplete: () => {
                    this.heldTrash = closest;
                    this.heldTrash.setVelocity(0, 0);
                    this.heldTrash.setDepth(2);
                }
            });
        }
    }

    switchMagnetMode() {
        this.magnetMode = (this.magnetMode + 1) % 3;
        this.magnet.setTexture(TRASH_TYPES[this.magnetMode].magnet);
    }

    dropTrash() {
        if (!this.heldTrash) return;
        // Animate falling when released
        const trash = this.heldTrash;
        this.heldTrash = null;
        trash.setDepth(1);
        trash.setGravityY(300);
        trash.setVelocity(0, 200);
        // Check if above a bin
        const bin = this.bins.find(bin => Math.abs(bin.x - this.magnet.x) < 60);
        if (bin) {
            trash.targetBin = bin;
            trash.checkDrop = true;
        } else {
            // If not above a bin, let it fall and count as a miss if it leaves screen
            trash.checkDrop = false;
        }
    }

    spawnTrash() {
        if (this.spawningStopped) return;
        // Calculate forbidden horizontal zone for magnet (centered at magnet.x)
        const forbiddenStart = this.magnet.x - 80;
        const forbiddenEnd = this.magnet.x + 80;
        let x;
        // Randomly pick left or right side of forbidden zone
        if (Phaser.Math.Between(0, 1) === 0) {
            x = Phaser.Math.Between(80, forbiddenStart - 1);
        } else {
            x = Phaser.Math.Between(forbiddenEnd + 1, 1520);
        }
        // Spawn in the vertical center between magnet and bins
        // Magnet y = 80, bins y = 560, so center is about (80+560)/2 = 320
        // Add some randomness around the center
        const y = Phaser.Math.Between(250, 390);
        const typeIdx = Phaser.Math.Between(0, 2);
        const type = TRASH_TYPES[typeIdx];
        // Randomly pick a trash key for this type
        const trashKey = type.key[Phaser.Math.Between(0, type.key.length - 1)];
        const trash = this.physics.add.sprite(x, y, trashKey);
        trash.trashType = type.type;
        // Dynamically scale trash to exactly 100x100 pixels
        const img = this.textures.get(trashKey).getSourceImage();
        const scaleX = this.trashTargetWidth / img.width;
        const scaleY = this.trashTargetHeight / img.height;
        trash.setScale(Math.min(scaleX, scaleY));
        trash.setAlpha(1);
        trash.setVelocity(0, Phaser.Math.Between(120, 180));
        trash.setGravityY(300);
        trash.checkDrop = false;
        this.trashGroup.add(trash);
        this.spawnedTrash++;
        // Stop spawning if reached stage limit
        if (this.spawnedTrash >= this.stageTrashCount[this.currentLevel]) {
            this.spawningStopped = true;
        }
    }

    updateTimer() {
        this.timeLeft--;
        this.updateUI();
        // If time runs out and there is still trash, player loses on stage 2 or 3, otherwise normal lose
        if (this.timeLeft <= 0) {
            if (this.trashGroup.countActive() > 0 || this.heldTrash) {
                // Stage 2 or 3: lose if not cleared in time
                if (this.currentLevel === 1 || this.currentLevel === 2) {
                    this.showEndMessage('You Lose!');
                } else {
                    this.showEndMessage('Time Up!');
                }
            } else {
                // All trash cleared exactly as timer hits 0
                this.checkLevelEnd();
            }
        }
    }

    updateUI() {
        document.getElementById('score').textContent = `Score: ${this.score}`;
        document.getElementById('timer').textContent = `Time: ${this.timeLeft}`;
        document.getElementById('level').textContent = `Level: ${this.currentLevel + 1}`;
        document.getElementById('strikes').textContent = `Strikes: ${this.strikes}`;
    }

    checkLevelEnd() {
        // Only progress if all trash is cleared and all trash for the stage has been spawned
        if (
            this.trashGroup.countActive() === 0 &&
            !this.heldTrash &&
            this.spawningStopped
        ) {
            // Stage 3: win if cleared all trash before time runs out, else lose
            if (this.currentLevel === 2) {
                if (this.timeLeft > 0) {
                    this.showEndMessage('You Win!');
                } else {
                    this.showEndMessage('You Lose!');
                }
                return;
            }
            // For stage 2, just advance to stage 3 (do not show win/lose)
            if (this.currentLevel === 1) {
                this.currentLevel++;
                this.bg.setTexture(this.levels[this.currentLevel].bg);
                this.timeLeft = 90;
                this.spawnedTrash = 0;
                this.spawningStopped = false;
                this.updateUI();
                return;
            }
            // Other stages: advance as normal
            if (this.currentLevel < this.levels.length - 1) {
                this.currentLevel++;
                this.bg.setTexture(this.levels[this.currentLevel].bg);
                this.timeLeft = 90; // Reset increased time for each level
                this.spawnedTrash = 0;
                this.spawningStopped = false;
                this.updateUI();
            } else {
                this.showEndMessage('You Win!');
            }
        }
        if (this.strikes >= 3) {
            this.showEndMessage('Too Many Strikes!');
        }
    }

    showEndMessage(text) {
        this.winLoseText.setText(text);
        this.winLoseText.setVisible(true);
        this.scene.pause();
        this.time.delayedCall(2000, () => {
            this.scene.restart();
        });
    }

    update(time, delta) {
        // Trash spawn logic: only spawn if less than 4 on screen, not above magnet, and not stopped
        if (
            !this.spawningStopped &&
            time > this.nextTrashTime &&
            this.timeLeft > 0 &&
            this.trashGroup.countActive() < 4
        ) {
            this.spawnTrash();
            this.nextTrashTime = time + Phaser.Math.Between(this.trashSpawnMin, this.trashSpawnMax);
        }
        // Animate held trash to follow magnet
        if (this.heldTrash) {
            this.heldTrash.x = this.magnet.x;
            this.heldTrash.y = this.magnet.y + 40;
            this.heldTrash.setVelocity(0, 0);
            this.heldTrash.setGravityY(0);
        }
        // Check for trash hitting bins (for falling trashes)
        this.trashGroup.getChildren().forEach(trash => {
            if (trash.active && !trash.processed) {
                // If trash is falling after being dropped by player
                if (trash.checkDrop && trash.targetBin) {
                    if (
                        Phaser.Math.Distance.Between(trash.x, trash.y, trash.targetBin.x, trash.targetBin.y) < 60 &&
                        trash.body.velocity.y > 0
                    ) {
                        trash.processed = true; // Prevent double processing
                        // Check if dropped into correct bin
                        if (trash.trashType === trash.targetBin.trashType) {
                            // Correct bin: score
                            // Calculate target scale so all trash animates to the same display size as the original
                            let origKey = '';
                            if (trash.trashType === 'bio') origKey = 'bio_trash';
                            if (trash.trashType === 'metal') origKey = 'metal_trash';
                            if (trash.trashType === 'plastic') origKey = 'plastic_trash';
                            const origImg = this.textures.get(origKey).getSourceImage();
                            const origAnimScale = 2.5; // existing animation scale for originals
                            const origDisplaySize = origImg.width * origAnimScale;
                            const thisImg = this.textures.get(trash.texture.key).getSourceImage();
                            // Calculate scale so this trash matches the original's animation display size
                            const targetScale = origDisplaySize / thisImg.width;
                            this.tweens.add({
                                targets: trash,
                                y: trash.y - 60, // Move up
                                scale: targetScale,
                                angle: 540, // 1.5 spins
                                alpha: 0,
                                duration: 700,
                                ease: 'Bounce.easeOut',
                                onComplete: () => {
                                    trash.destroy();
                                    this.score++;
                                    this.updateUI();
                                    this.checkLevelEnd();
                                }
                            });
                        } else {
                            // Wrong bin: shake, turn red, and fade out
                            trash.setTint(0xff3333);
                            this.tweens.add({
                                targets: trash,
                                x: { from: trash.x - 20, to: trash.x + 20 },
                                duration: 80,
                                yoyo: true,
                                repeat: 3,
                                onComplete: () => {
                                    this.tweens.add({
                                        targets: trash,
                                        alpha: 0,
                                        duration: 400,
                                        onComplete: () => {
                                            trash.destroy();
                                            this.strikes++;
                                            this.updateUI();
                                            this.checkLevelEnd();
                                        }
                                    });
                                }
                            });
                        }
                    }
                } else if (!this.heldTrash) {
                    // For auto-falling trashes (not dropped by player)
                    this.bins.forEach(bin => {
                        if (
                            trash.trashType === bin.trashType &&
                            Phaser.Math.Distance.Between(trash.x, trash.y, bin.x, bin.y) < 60 &&
                            trash.body.velocity.y > 0
                        ) {
                            trash.processed = true; // Prevent double processing
                            this.tweens.add({
                                targets: trash,
                                scale: 2,
                                alpha: 0,
                                duration: 500,
                                ease: 'Cubic.easeIn',
                                onComplete: () => {
                                    trash.destroy();
                                    this.score++;
                                    this.updateUI();
                                    this.checkLevelEnd();
                                }
                            });
                        }
                    });
                }
                // Remove trash if it falls below the screen
                if (trash.y > 650 && !trash.processed) {
                    trash.processed = true; // Prevent double processing
                    trash.destroy();
                    this.strikes++;
                    this.updateUI();
                    this.checkLevelEnd();
                }
            }
        });
    }
}

const config = {
    type: Phaser.AUTO,
    width: 1600,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [MainScene]
};

const game = new Phaser.Game(config);