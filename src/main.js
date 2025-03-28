
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { gsap } from 'gsap';

// Create loading overlay
function createLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        backdrop-filter: blur(5px);
    `;

    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
        width: 300px;
        background: #e0e0e0;
        border-radius: 13px;
        padding: 3px;
    `;

    const progressBar = document.createElement('div');
    progressBar.id = 'progress-bar';
    progressBar.style.cssText = `
        width: 0%;
        height: 20px;
        background: #4CAF50;
        border-radius: 10px;
        transition: width 0.5s ease-in-out;
    `;

    progressContainer.appendChild(progressBar);
    overlay.appendChild(progressContainer);
    document.body.appendChild(overlay);

    return {
        overlay,
        progressBar
    };
}

// Main 3D Scene Setup
function init3DScene() {
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
        45, 
        window.innerWidth / window.innerHeight, 
        0.1, 
        1000
    );
    camera.position.set(-15, 5, -15);

    const renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(renderer.domElement);

    // Lighting
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.minPolarAngle = Math.PI / 4;
    controls.maxPolarAngle = Math.PI * 3 / 4;

    // Create low-poly placeholder
    const placeholderGeometry = new THREE.BoxGeometry(2, 2, 2);
    const placeholderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x888888, 
        wireframe: true 
    });
    const placeholderMesh = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
    scene.add(placeholderMesh);

    // Flame particles creation function
    function createFlameParticles() {
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 500;

        const posArray = new Float32Array(particlesCount * 3);
        const colorArray = new Float32Array(particlesCount * 3);

        for (let i = 0; i < particlesCount; i++) {
            const radius = Math.random() * 0.8;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);

            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi) * 3;

            posArray[i * 3] = x;
            posArray[i * 3 + 1] = y;
            posArray[i * 3 + 2] = z;

            const intensity = Math.random();
            colorArray[i * 3] = 1;
            colorArray[i * 3 + 1] = intensity * 0.5;
            colorArray[i * 3 + 2] = 0;
        }

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.8
        });

        return new THREE.Points(particlesGeometry, particlesMaterial);
    }
    const loadingManager = new THREE.LoadingManager();
    const { overlay, progressBar } = createLoadingOverlay();

    
    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
        const progress = (itemsLoaded / itemsTotal) * 100;
        progressBar.style.width = `${progress}%`;
    };

    // Loaders
    const gltfLoader = new GLTFLoader(loadingManager);
    const rgbLoader = new RGBELoader(loadingManager);


    rgbLoader.load('./belfast_sunset_puresky_4k.hdr', (texture) => {
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    
        scene.background = envMap;
        scene.environment = envMap;
    
        texture.dispose();
        pmremGenerator.dispose();
    });
    
    let model, flame;
    gltfLoader.load(
        './plane.glb',
        (gltf) => {
            // Model loaded
            model = gltf.scene;
            scene.add(model);
    
            // Set initial properties for the model
            model.scale.set(0, 0, 0);
            model.position.set(0, -2, 0);
            model.rotation.set(0, Math.PI, Math.PI / 4);
    
            // Remove placeholder
            scene.remove(placeholderMesh);
    
            // Add flame particles
            flame = createFlameParticles();
            scene.add(flame);
    
            // Start GSAP animation after loading is complete
            setTimeout(()=>{
                document.body.removeChild(overlay);
                gsap.timeline()
                .to(model.scale, {
                    x: 2,
                    y: 2,
                    z: 2,
                    duration: 1.5,
                    ease: 'elastic.out(1, 0.5)',
                })
                .to(
                    model.position,
                    {
                        y: 0,
                        duration: 1,
                        ease: 'power2.out',
                    },
                    '<'
                )
                .to(
                    model.rotation,
                    {
                        y: 0,
                        duration: 1,
                        ease: 'power2.out',
                    },
                    '<'
                );
            },1000)
        },
        (xhr) => {
            // Progress tracking
            const progress = (xhr.loaded / xhr.total) * 100;
            progressBar.style.width = `${progress}%`;
        },
        (error) => {
            console.error('Error loading model:', error);
            // Remove loading overlay in case of error
            document.body.removeChild(overlay);
        }
    );
    // Animation loop
    function animateFlame() {
        if (flame && model) {
            flame.position.set(-0.2, 0.2, 16);
            const positions = flame.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += (Math.random() - 0.5) * 0.02;
            }
            flame.geometry.attributes.position.needsUpdate = true;
        }
    }

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        animateFlame();
        renderer.render(scene, camera);
    }

    // Resize handler
    function handleResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    window.addEventListener('resize', handleResize);
    animate();
}

// Initialize the scene when the window loads
window.addEventListener('load', init3DScene);