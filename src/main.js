
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { gsap } from 'gsap';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(
    45, 
    window.innerWidth / window.innerHeight, 
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

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;

controls.minPolarAngle = Math.PI / 4; 
controls.maxPolarAngle = Math.PI * 3 / 4; 

const axesHelper = new THREE.AxesHelper(50);
scene.add(axesHelper);
const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.ShadowMaterial({ opacity: 0.5 })
);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.y = -1;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

const rgbLoader = new RGBELoader().load('./belfast_sunset_puresky_4k.hdr', (texture) => {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    
    scene.background = envMap;
    scene.environment = envMap;

    texture.dispose();
    pmremGenerator.dispose();
});

let flameParticles;
function createFlameParticles() {
  const particlesGeometry = new THREE.BufferGeometry();
  const particlesCount = 500; 

  const posArray = new Float32Array(particlesCount * 3);
  const colorArray = new Float32Array(particlesCount * 3);

  for (let i = 0; i < particlesCount; i++) {
      // Generate random spherical coordinates
      const radius = Math.random() * 0.8; 
      const theta = Math.random() * Math.PI * 2; 
      const phi = Math.acos((Math.random() * 2) - 1);

    
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi)*3  ;

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
      size: 0.2, // Adjust particle size
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.8
  });

  flameParticles = new THREE.Points(particlesGeometry, particlesMaterial);
  return flameParticles;
}

const loader = new GLTFLoader();
let model, flame;
loader.load('./plane.glb', (gltf) => {
    model = gltf.scene;
    scene.add(model);
    model.scale.set(0, 0, 0);
    model.position.set(0, -2, 0); 
    model.rotation.set(0, Math.PI, Math.PI / 4);
    flame = createFlameParticles();
    scene.add(flame);

    gsap.timeline()
        .to(model.scale, {
            x: 2,
            y: 2,
            z: 2,
            duration: 1.5,
            ease: 'elastic.out(1, 0.5)',
        })
        .to(model.position, {
            y: 0, 
            duration: 1,
            ease: 'power2.out',
        }, '<')
        .to(model.rotation, {
            y: 0, 
            duration: 1,
            ease: 'power2.out',
        }, '<');
}, undefined, (error) => {
    console.error('Error loading model:', error);
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

let flag=true;
function animateFlame() {
    if (flame && model) {
        flame.position.set(-0.2,0.2,16)
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
  renderer.render(scene, camera);

animate();