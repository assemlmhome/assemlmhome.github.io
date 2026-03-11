window.addEventListener('DOMContentLoaded', function () {
  var burger = document.querySelector('.navbar-burger');
  if (burger) {
    var targetId = burger.dataset.target;
    var target = targetId ? document.getElementById(targetId) : null;
    burger.addEventListener('click', function () {
      burger.classList.toggle('is-active');
      if (target) {
        target.classList.toggle('is-active');
      }
    });
  }

	  var VISER_PLACEHOLDER_TEXT = 'Choose a scene above';
	  var VISER_READY_TEXT = 'Click and move me';

	  function getViewerBanner(viewer) {
	    if (!viewer || !viewer.parentElement) {
	      return null;
	    }
	    return viewer.parentElement.querySelector('.viser-banner');
	  }

	  function getViewerHint(viewer) {
	    if (!viewer) {
	      return null;
	    }
	    var container = viewer.closest('.interactive-card--viewer, .dataset-block--viewer');
	    if (!container) {
	      return null;
	    }
	    return container.querySelector('[data-viser-hint]');
	  }

	  function setViewerHintVisible(viewer, visible) {
	    var hint = getViewerHint(viewer);
	    if (!hint) {
	      return;
	    }
	    hint.classList.toggle('is-hidden', !visible);
	  }

	  function setViewerPlaybackDock(viewer, enabled) {
	    if (!viewer || !viewer.parentElement) {
	      return;
	    }
	    viewer.parentElement.classList.toggle('pw-viser-with-playback', !!enabled);
	  }

	  function setViewerBanner(banner, isPlaceholder) {
	    if (!banner) {
	      return;
	    }
	    if (isPlaceholder) {
	      banner.textContent = VISER_PLACEHOLDER_TEXT;
	      banner.classList.add('is-placeholder');
	      banner.classList.remove('is-hidden');
	      return;
	    }
	    banner.textContent = VISER_READY_TEXT;
	    banner.classList.remove('is-placeholder');
	    banner.classList.add('is-hidden');
	  }

	  var videos = document.querySelectorAll('video');
	  videos.forEach(function (video) {
	    video.addEventListener('loadedmetadata', function () {
	      if (video.classList.contains('experiment-video')) {
	        video.playbackRate = 2.0;
	      }
	      var playPromise = video.play();
	      if (playPromise && playPromise.catch) {
	        playPromise.catch(function () {});
	      }
	    });
	  });

	  var experimentVideos = document.querySelectorAll('video.experiment-video');
	  experimentVideos.forEach(function (video) {
	    if (video.parentElement && video.parentElement.classList.contains('experiment-video-wrapper')) {
	      return;
	    }
	    var parent = video.parentNode;
	    if (!parent) {
	      return;
	    }
	    var wrapper = document.createElement('div');
	    wrapper.className = 'experiment-video-wrapper';
	    parent.insertBefore(wrapper, video);
	    wrapper.appendChild(video);

	    var badge = document.createElement('div');
	    badge.className = 'video-speed-badge';
	    badge.textContent = '2×';
	    wrapper.appendChild(badge);
	  });

  var DEFAULT_CAMERA = {
    position: '1.00,0.00,1.00',
    lookAt: '0.00,0.00,0.00',
    up: '0.000,0.000,1.000'
  };

  function mergeCamera(camera, fallback) {
    var base = fallback || DEFAULT_CAMERA;
    return {
      position: camera && camera.position ? camera.position : base.position,
      lookAt: camera && camera.lookAt ? camera.lookAt : base.lookAt,
      up: camera && camera.up ? camera.up : base.up
    };
  }

	  function buildViewerSrc(base, filename, camera, fallback, dockPlayback) {
	    var merged = mergeCamera(camera, fallback);
	    var rawPath = '../../' + base + '/' + filename;
	    var encoded = encodeURI(rawPath).replace(/\+/g, '%2B');
	    return 'static/viser-client/index.html?playbackPath=' + encoded +
	      '&initialCameraPosition=' + encodeURIComponent(merged.position) +
	      '&initialCameraLookAt=' + encodeURIComponent(merged.lookAt) +
	      '&initialCameraUp=' + encodeURIComponent(merged.up) +
	      (dockPlayback ? '&pwDockPlayback=1' : '');
	  }

  initInteractiveSection();
  initDatasetSection();

  function initInteractiveSection() {
    // Shared viewers (lazy init)
    var predFrame = document.getElementById('interactive-pred');
    var gtFrame = document.getElementById('interactive-gt');
    if (predFrame) { predFrame.removeAttribute('src'); predFrame.dataset.base = ''; }
    if (gtFrame) { gtFrame.removeAttribute('src'); gtFrame.dataset.base = ''; }
	    var predBanner = getViewerBanner(predFrame);
	    var gtBanner = getViewerBanner(gtFrame);
	    setViewerBanner(predBanner, true);
	    setViewerBanner(gtBanner, true);
	    setViewerHintVisible(predFrame, false);
	    setViewerHintVisible(gtFrame, false);
	    setViewerPlaybackDock(predFrame, false);
	    setViewerPlaybackDock(gtFrame, false);

    function getInteractiveCamera(button, target) {
      if (!button) {
        return DEFAULT_CAMERA;
      }
      var suffix = target ? '-' + target : '';
      var position = button.getAttribute('data-camera-position' + suffix) || button.getAttribute('data-camera-position');
      var lookAt = button.getAttribute('data-camera-lookat' + suffix) || button.getAttribute('data-camera-lookat');
      var up = button.getAttribute('data-camera-up' + suffix) || button.getAttribute('data-camera-up');
      return {
        position: position || DEFAULT_CAMERA.position,
        lookAt: lookAt || DEFAULT_CAMERA.lookAt,
        up: up || DEFAULT_CAMERA.up
      };
    }

    function initOneCarousel(opts) {
      var container = opts.container;
      var thumbRow = container.querySelector(opts.thumbRowSelector);
      var thumbs = Array.from(container.querySelectorAll(opts.thumbRowSelector + ' .interactive-thumb'));
      var dotsContainer = container.querySelector(opts.dotsSelector);
      var inputsCard = document.getElementById(opts.inputsCardId);
      var imageRoles = opts.imageRoles; // e.g., ['rgb0','depth0','rgb1','depth1'] or with rgb2/depth2
      var imageMap = {};
      imageRoles.forEach(function (r) { imageMap[r] = inputsCard ? inputsCard.querySelector('[data-role="' + r + '"]') : null; });
      var manualRoles = opts.manualRoles || [];
      var manualMap = {};
      manualRoles.forEach(function (r) { manualMap[r] = inputsCard ? inputsCard.querySelector('[data-manual-role="' + r + '"]') : null; });
      var manualControls = inputsCard ? inputsCard.querySelector('.interactive-step-controls') : null;
      var manualStepLabel = inputsCard ? inputsCard.querySelector('[data-manual-step-label]') : null;
      var manualPlaceholder = inputsCard ? inputsCard.querySelector('[data-manual-placeholder]') : null;
      var manualGrid = inputsCard ? inputsCard.querySelector('.interactive-manual-grid') : null;
      var manualOverview = inputsCard ? inputsCard.querySelector('[data-manual-overview]') : null;
      var instructionPanel = inputsCard ? inputsCard.querySelector('[data-instruction-panel]') : null;
      var instructionPlaceholder = inputsCard ? inputsCard.querySelector('[data-instruction-placeholder]') : null;
      var instructionContent = inputsCard ? inputsCard.querySelector('[data-instruction-content]') : null;
      var instructionPrecise = inputsCard ? inputsCard.querySelector('[data-instruction-precise]') : null;
      var instructionVague = inputsCard ? inputsCard.querySelector('[data-instruction-vague]') : null;
      var instructionStepLabel = inputsCard ? inputsCard.querySelector('[data-instruction-step-label]') : null;
      var pointcloudPanel = inputsCard ? inputsCard.querySelector('[data-pointcloud-panel]') : null;
      var pointcloudPlaceholder = inputsCard ? inputsCard.querySelector('[data-pointcloud-placeholder]') : null;
      var pointcloudStepLabel = inputsCard ? inputsCard.querySelector('[data-pointcloud-step-label]') : null;
      var pointcloudViewerTarget = inputsCard ? inputsCard.querySelector('[data-pointcloud-viewer-target]') : null;
      var pointcloudViewerInput = inputsCard ? inputsCard.querySelector('[data-pointcloud-viewer-input]') : null;
      var pointcloudViewerPrediction = inputsCard ? inputsCard.querySelector('[data-pointcloud-viewer-prediction]') : null;
      var pointcloudStatus = inputsCard ? inputsCard.querySelector('[data-pointcloud-status]') : null;
      var pointcloudLegend = inputsCard ? inputsCard.querySelector('[data-pointcloud-legend]') : null;
      var pointcloudRandomize = inputsCard ? inputsCard.querySelector('[data-pointcloud-randomize]') : null;
      var pointcloudPredictionValues = inputsCard ? inputsCard.querySelector('[data-pointcloud-prediction-values]') : null;
      var pointcloudPredictionTokens = inputsCard ? inputsCard.querySelector('[data-pointcloud-prediction-tokens]') : null;
      var manualState = { base: '', prefix: '', steps: 0, activeStep: 0, stylePrefix: 'manual_' };
      var instructionState = { url: '', steps: 0, activeStep: 0, data: null };
      var pointcloudState = { base: '', prefix: '', steps: 0, activeStep: 0, cache: {}, requestToken: 0, sample: null, transform: null };
      var manualMagnifier = null;
      var pointcloudViewers = {
        target: null,
        input: null,
        prediction: null
      };
      if (manualRoles.length) {
        setTimeout(function () {
          setManualPlaceholderText('Select an asset above to view assembly steps.');
          setPointcloudPlaceholderText('Select an asset above to view point clouds.');
          setInstructionPlaceholderText('Select an asset above to view instructions.');
          setManualVisible(false);
          setPointcloudVisible(false);
          setInstructionVisible(false);
        }, 0);
        manualMagnifier = initManualMagnifier();
        if (manualMagnifier) manualMagnifier.init();
      }

      var interactiveDots = [];
      if (dotsContainer) {
        dotsContainer.innerHTML = '';
        interactiveDots = thumbs.map(function (_, idx) {
          var dot = document.createElement('button');
          dot.type = 'button';
          dot.className = 'carousel-dot' + (idx === 0 && opts.autoActivate ? ' is-active' : '');
          dot.setAttribute('aria-label', 'Show interactive scene ' + (idx + 1));
          dot.addEventListener('click', function () { api.activate(idx); });
          dotsContainer.appendChild(dot);
          return dot;
        });
      }

      // Magnifier bound to this inputs grid
      var interactiveMagnifier = (function () {
        var zoom = 2.5;
        var lensSize = 180;
        var lensByRole = {};
        function ensureLens(role) {
          if (!lensByRole[role]) {
            var lens = document.createElement('div');
            lens.className = 'dataset-magnifier-lens is-hidden';
            document.body.appendChild(lens);
            lensByRole[role] = lens;
          }
          return lensByRole[role];
        }
        function hideAll() {
          Object.keys(lensByRole).forEach(function (k) { var l = lensByRole[k]; if (l) l.classList.add('is-hidden'); });
        }
        function computeDisplayPos(img, clientX, clientY) {
          var rect = img.getBoundingClientRect();
          var x = clientX - rect.left; var y = clientY - rect.top;
          x = Math.max(0, Math.min(rect.width, x));
          y = Math.max(0, Math.min(rect.height, y));
          return { x: x, y: y, rect: rect };
        }
        function applyLens(lens, img, dispPos) {
          var bgSize = (dispPos.rect.width * zoom) + 'px ' + (dispPos.rect.height * zoom) + 'px';
          var bgPosX = -(dispPos.x * zoom - lensSize / 2);
          var bgPosY = -(dispPos.y * zoom - lensSize / 2);
          lens.style.backgroundImage = 'url("' + (img.currentSrc || img.src) + '")';
          lens.style.backgroundSize = bgSize;
          lens.style.backgroundPosition = bgPosX + 'px ' + bgPosY + 'px';
        }
        function placeLensNearPoint(lens, viewportX, viewportY) {
          var offset = 12; var left = viewportX + offset; var top = viewportY - lensSize / 2;
          if (left + lensSize > window.innerWidth - 8) { left = viewportX - lensSize - offset; }
          top = Math.max(8, Math.min(window.innerHeight - lensSize - 8, top));
          lens.style.left = Math.round(left) + 'px'; lens.style.top = Math.round(top) + 'px';
        }
        function onMove(evt, role) {
          var img = imageMap[role]; if (!img) return;
          var lens = ensureLens(role);
          var disp = computeDisplayPos(img, evt.clientX, evt.clientY);
          applyLens(lens, img, disp);
          placeLensNearPoint(lens, disp.rect.left + disp.x, disp.rect.top + disp.y);
          lens.classList.remove('is-hidden');
        }
        function onLeave(role) { var lens = ensureLens(role); if (lens) lens.classList.add('is-hidden'); }
        function bind(img, role) {
          if (!img) return;
          img.addEventListener('mouseenter', function (e) { onMove(e, role); });
          img.addEventListener('mousemove', function (e) { onMove(e, role); });
          img.addEventListener('mouseleave', function () { onLeave(role); });
          window.addEventListener('scroll', function () { onLeave(role); }, { passive: true });
          window.addEventListener('resize', function () { onLeave(role); });
        }
        function init() { imageRoles.forEach(function (role) { bind(imageMap[role], role); }); }
        return { init: init, hideAll: hideAll };
      })();

      function updateImages(base, label) {
        function set(role, path, alt) { if (imageMap[role]) { imageMap[role].src = base + '/' + path; imageMap[role].alt = (label || '') + ' ' + alt; } }
        set('rgb0', 'cameras-rgb/cam0.png', 'RGB cam0');
        set('depth0', 'cameras-depth/cam0.png', 'depth cam0');
        set('rgb1', 'cameras-rgb/cam1.png', 'RGB cam1');
        set('depth1', 'cameras-depth/cam1.png', 'depth cam1');
        if (imageMap.rgb2) set('rgb2', 'cameras-rgb/cam2.png', 'RGB cam2');
        if (imageMap.depth2) set('depth2', 'cameras-depth/cam2.png', 'depth cam2');
      }

      function setManualVisible(enabled) {
        if (manualPlaceholder) manualPlaceholder.classList.toggle('is-hidden', !!enabled);
        if (manualGrid) manualGrid.classList.toggle('is-hidden', !enabled);
        if (manualControls) manualControls.classList.toggle('is-hidden', !enabled);
        if (manualOverview) manualOverview.classList.toggle('is-hidden', !enabled);
      }

      function setManualPlaceholderText(text) {
        if (manualPlaceholder) {
          manualPlaceholder.textContent = text;
        }
      }

      function setPointcloudVisible(enabled) {
        if (!pointcloudPanel) return;
        if (pointcloudPlaceholder) pointcloudPlaceholder.classList.toggle('is-hidden', !!enabled);
        if (pointcloudViewerTarget) pointcloudViewerTarget.parentElement.classList.toggle('is-hidden', !enabled);
        if (pointcloudViewerInput) pointcloudViewerInput.parentElement.classList.toggle('is-hidden', !enabled);
        if (pointcloudViewerPrediction) pointcloudViewerPrediction.parentElement.classList.toggle('is-hidden', !enabled);
        if (pointcloudStatus) pointcloudStatus.classList.toggle('is-hidden', !enabled);
        if (pointcloudLegend) pointcloudLegend.classList.toggle('is-hidden', !enabled);
        if (pointcloudRandomize) pointcloudRandomize.classList.toggle('is-hidden', !enabled);
        if (pointcloudPredictionValues && pointcloudPredictionValues.parentElement) {
          pointcloudPredictionValues.parentElement.classList.toggle('is-hidden', !enabled);
        }
      }

      function setInstructionVisible(enabled) {
        if (!instructionPanel) return;
        if (instructionPlaceholder) instructionPlaceholder.classList.toggle('is-hidden', !!enabled);
        if (instructionContent) instructionContent.classList.toggle('is-hidden', !enabled);
      }

      function setInstructionPlaceholderText(text) {
        if (instructionPlaceholder) {
          instructionPlaceholder.textContent = text;
        }
      }

      function setPointcloudPlaceholderText(text) {
        if (pointcloudPlaceholder) {
          pointcloudPlaceholder.textContent = text;
        }
      }

      function renderManualOverview(base, prefix, steps, label) {
        if (!manualOverview) return;
        manualOverview.innerHTML = '';
        var total = steps + 1;
        var coloredDir = (manualState.stylePrefix || '') + 'colored';
        for (var i = 0; i < total; i++) {
          var img = document.createElement('img');
          img.src = base + '/' + coloredDir + '/' + prefix + '_' + i + '.png';
          img.alt = (label || '') + ' colored ' + (i + 1);
          manualOverview.appendChild(img);
        }
      }

      function initManualMagnifier() {
        if (!manualRoles.length) return null;
        var zoom = 2.5;
        var lensSize = 180;
        var lensByRole = {};
        function ensureLens(role) {
          if (!lensByRole[role]) {
            var lens = document.createElement('div');
            lens.className = 'dataset-magnifier-lens is-hidden';
            document.body.appendChild(lens);
            lensByRole[role] = lens;
          }
          return lensByRole[role];
        }
        function hideAll() {
          Object.keys(lensByRole).forEach(function (k) {
            var lens = lensByRole[k];
            if (lens) lens.classList.add('is-hidden');
          });
        }
        function computeDisplayPos(img, clientX, clientY) {
          var rect = img.getBoundingClientRect();
          var x = clientX - rect.left;
          var y = clientY - rect.top;
          x = Math.max(0, Math.min(rect.width, x));
          y = Math.max(0, Math.min(rect.height, y));
          return { x: x, y: y, rect: rect };
        }
        function applyLens(lens, img, dispPos) {
          var bgSize = (dispPos.rect.width * zoom) + 'px ' + (dispPos.rect.height * zoom) + 'px';
          var bgPosX = -(dispPos.x * zoom - lensSize / 2);
          var bgPosY = -(dispPos.y * zoom - lensSize / 2);
          lens.style.backgroundImage = 'url("' + (img.currentSrc || img.src) + '")';
          lens.style.backgroundSize = bgSize;
          lens.style.backgroundPosition = bgPosX + 'px ' + bgPosY + 'px';
        }
        function placeLensNearPoint(lens, viewportX, viewportY) {
          var offset = 12;
          var left = viewportX + offset;
          var top = viewportY - lensSize / 2;
          if (left + lensSize > window.innerWidth - 8) {
            left = viewportX - lensSize - offset;
          }
          top = Math.max(8, Math.min(window.innerHeight - lensSize - 8, top));
          lens.style.left = Math.round(left) + 'px';
          lens.style.top = Math.round(top) + 'px';
        }
        function onMove(evt, role) {
          var img = manualMap[role];
          if (!img) return;
          var lens = ensureLens(role);
          var disp = computeDisplayPos(img, evt.clientX, evt.clientY);
          applyLens(lens, img, disp);
          placeLensNearPoint(lens, disp.rect.left + disp.x, disp.rect.top + disp.y);
          lens.classList.remove('is-hidden');
        }
        function onLeave(role) {
          var lens = ensureLens(role);
          if (lens) lens.classList.add('is-hidden');
        }
        function bind(img, role) {
          if (!img) return;
          img.addEventListener('mouseenter', function (e) { onMove(e, role); });
          img.addEventListener('mousemove', function (e) { onMove(e, role); });
          img.addEventListener('mouseleave', function () { onLeave(role); });
          window.addEventListener('scroll', function () { onLeave(role); }, { passive: true });
          window.addEventListener('resize', function () { onLeave(role); });
        }
        function init() { manualRoles.forEach(function (role) { bind(manualMap[role], role); }); }
        return { init: init, hideAll: hideAll };
      }

      function manualRoleSpec(role, stylePrefix) {
        var parts = role.split('-');
        var style = parts[0];
        var state = parts[1];
        var styleDirMap = {
          colored: (stylePrefix || '') + 'colored',
          freestyle: (stylePrefix || '') + 'freestyle',
          lineart: (stylePrefix || '') + 'lineart',
          nonfreestyle: (stylePrefix || '') + 'nonfreestyle'
        };
        return { styleDir: styleDirMap[style], state: state };
      }

      function updateManualStepLabel(stepIdx) {
        if (manualStepLabel) {
          manualStepLabel.textContent = String(stepIdx + 1);
        }
      }

      function updateInstructionStepLabel(stepIdx) {
        if (instructionStepLabel) {
          instructionStepLabel.textContent = String(stepIdx + 1);
        }
      }

      function updatePointcloudStepLabel(stepIdx) {
        if (pointcloudStepLabel) {
          pointcloudStepLabel.textContent = String(stepIdx + 1);
        }
      }

      function updateManualImages(base, prefix, stepIdx, label) {
        manualRoles.forEach(function (role) {
          var img = manualMap[role];
          if (!img) return;
          var spec = manualRoleSpec(role, manualState.stylePrefix);
          if (!spec.styleDir) return;
          var offset = spec.state === 'after' ? 1 : 0;
          var fileIndex = stepIdx + offset;
          var filename = prefix + '_' + fileIndex + '.png';
          img.src = base + '/' + spec.styleDir + '/' + filename;
          img.alt = (label || '') + ' ' + role.replace('-', ' ');
        });
      }


      function createPointcloudViewer(container) {
        if (!container || !window.THREE) return null;
        var viewer = {
          container: container,
          scene: new THREE.Scene(),
          camera: new THREE.PerspectiveCamera(45, 1, 0.01, 100),
          renderer: new THREE.WebGLRenderer({ antialias: true, alpha: true }),
          points: [],
          axes: null,
          controls: {
            target: new THREE.Vector3(0, 0, 0),
            radius: 1,
            theta: -Math.PI / 2,
            phi: Math.PI / 2,
            dragging: false,
            lastX: 0,
            lastY: 0
          }
        };
        viewer.scene.background = new THREE.Color(0xffffff);
        viewer.axes = buildPointcloudAxes(0.3);
        viewer.scene.add(viewer.axes);
        viewer.camera.up.set(0, 0, 1);
        viewer.camera.position.set(0.6, 0.6, 0.6);
        viewer.renderer.setPixelRatio(window.devicePixelRatio || 1);
        container.innerHTML = '';
        container.appendChild(viewer.renderer.domElement);
        initPointcloudControls(viewer);
        resizePointcloudViewer(viewer);
        container._pointcloudResize = function () { resizePointcloudViewer(viewer); };
        animatePointcloudViewer(viewer);
        return viewer;
      }

      function attachPointcloudViewer(viewer, container) {
        if (!viewer || !container || !viewer.renderer) return viewer;
        viewer.container = container;
        if (container.firstChild !== viewer.renderer.domElement) {
          container.innerHTML = '';
          container.appendChild(viewer.renderer.domElement);
        }
        container._pointcloudResize = function () { resizePointcloudViewer(viewer); };
        resizePointcloudViewer(viewer);
        return viewer;
      }

      function ensurePointcloudViewers() {
        if (!pointcloudViewers.target) {
          pointcloudViewers.target = createPointcloudViewer(pointcloudViewerTarget);
        } else {
          attachPointcloudViewer(pointcloudViewers.target, pointcloudViewerTarget);
        }
        if (!pointcloudViewers.input) {
          pointcloudViewers.input = createPointcloudViewer(pointcloudViewerInput);
        } else {
          attachPointcloudViewer(pointcloudViewers.input, pointcloudViewerInput);
        }
        if (!pointcloudViewers.prediction) {
          pointcloudViewers.prediction = createPointcloudViewer(pointcloudViewerPrediction);
        } else {
          attachPointcloudViewer(pointcloudViewers.prediction, pointcloudViewerPrediction);
        }
      }

      function initPointcloudControls(viewer) {
        if (!viewer || !viewer.renderer || !viewer.camera || !window.THREE) return;
        var state = viewer.controls;
        var canvas = viewer.renderer.domElement;
        canvas.addEventListener('mousedown', function (e) {
          state.dragging = true;
          state.lastX = e.clientX;
          state.lastY = e.clientY;
        });
        window.addEventListener('mouseup', function () {
          state.dragging = false;
        });
        canvas.addEventListener('mouseleave', function () {
          state.dragging = false;
        });
        canvas.addEventListener('mousemove', function (e) {
          if (!state.dragging) return;
          var dx = e.clientX - state.lastX;
          var dy = e.clientY - state.lastY;
          state.lastX = e.clientX;
          state.lastY = e.clientY;
          state.theta -= dx * 0.005;
          state.phi -= dy * 0.005;
          var eps = 0.05;
          state.phi = Math.max(eps, Math.min(Math.PI - eps, state.phi));
          updatePointcloudCameraFromSpherical(viewer);
        });
        canvas.addEventListener('wheel', function (e) {
          e.preventDefault();
          var factor = 1 + (e.deltaY * 0.001);
          state.radius = Math.max(0.05, state.radius * factor);
          updatePointcloudCameraFromSpherical(viewer);
        }, { passive: false });
      }

      function resizePointcloudViewer(viewer) {
        if (!viewer || !viewer.renderer || !viewer.container || !viewer.camera) return;
        var rect = viewer.container.getBoundingClientRect();
        var w = Math.max(1, Math.floor(rect.width));
        var h = Math.max(1, Math.floor(rect.height));
        viewer.renderer.setSize(w, h, false);
        viewer.camera.aspect = w / h;
        viewer.camera.updateProjectionMatrix();
      }

      function animatePointcloudViewer(viewer) {
        if (!viewer || !viewer.renderer || !viewer.scene || !viewer.camera) return;
        function frame() {
          if (!viewer.renderer || !viewer.scene || !viewer.camera) return;
          viewer.renderer.render(viewer.scene, viewer.camera);
          requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }

      function clearPointcloudPoints(viewer) {
        if (!viewer || !viewer.scene) return;
        viewer.points.forEach(function (obj) {
          viewer.scene.remove(obj);
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) obj.material.dispose();
        });
        viewer.points = [];
      }

      function setPointcloudStatus(text) {
        if (pointcloudStatus) {
          pointcloudStatus.textContent = text || '';
        }
      }

      function parseNpy(buffer) {
        var view = new DataView(buffer);
        var magic = String.fromCharCode.apply(null, new Uint8Array(buffer, 0, 6));
        if (magic !== '\u0093NUMPY') {
          throw new Error('Invalid NPY header');
        }
        var major = view.getUint8(6);
        var headerLen = major <= 1 ? view.getUint16(8, true) : view.getUint32(8, true);
        var headerOffset = major <= 1 ? 10 : 12;
        var header = new TextDecoder('ascii').decode(new Uint8Array(buffer, headerOffset, headerLen));
        var descrMatch = header.match(/'descr'\s*:\s*'([^']+)'/);
        var shapeMatch = header.match(/'shape'\s*:\s*\(([^\)]*)\)/);
        var orderMatch = header.match(/'fortran_order'\s*:\s*(True|False)/);
        if (!descrMatch || !shapeMatch) {
          throw new Error('Invalid NPY metadata');
        }
        var descr = descrMatch[1];
        var littleEndian = descr[0] === '<' || descr[0] === '|';
        if (!littleEndian) {
          throw new Error('Only little-endian NPY is supported');
        }
        var dtype = descr.slice(1);
        var shapeParts = shapeMatch[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        var shape = shapeParts.map(function (s) { return parseInt(s, 10); });
        var fortranOrder = orderMatch && orderMatch[1] === 'True';
        if (fortranOrder) {
          throw new Error('Fortran-order NPY not supported');
        }
        var dataOffset = headerOffset + headerLen;
        var dataBuffer = buffer.slice(dataOffset);
        var data;
        if (dtype === 'f4') {
          data = new Float32Array(dataBuffer);
        } else if (dtype === 'f8') {
          data = new Float64Array(dataBuffer);
        } else {
          throw new Error('Unsupported dtype: ' + dtype);
        }
        return { data: data, shape: shape };
      }

      function loadNpy(url) {
        return fetch(url)
          .then(function (res) {
            if (!res.ok) {
              throw new Error('Failed to fetch ' + url);
            }
            return res.arrayBuffer();
          })
          .then(parseNpy);
      }

      function npyToFloat32(data) {
        var points = data && data.data ? data.data : null;
        if (!points || points.length < 3) return null;
        return new Float32Array(points);
      }

      function arrayToPoints(points, colorHex) {
        if (!points || points.length < 3) return null;
        var geometry = new THREE.BufferGeometry();
        var count = Math.floor(points.length / 3);
        var positions = new Float32Array(count * 3);
        for (var i = 0; i < count * 3; i++) {
          positions[i] = points[i];
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.computeBoundingSphere();
        var material = new THREE.PointsMaterial({
          size: 0.01,
          color: colorHex,
          sizeAttenuation: true
        });
        return new THREE.Points(geometry, material);
      }

      function fitPointcloudCamera(viewer) {
        if (!viewer || !viewer.scene || !viewer.camera) return;
        var box = new THREE.Box3();
        viewer.points.forEach(function (obj) { box.expandByObject(obj); });
        if (box.isEmpty()) return;
        var center = box.getCenter(new THREE.Vector3());
        var size = box.getSize(new THREE.Vector3());
        var maxDim = Math.max(size.x, size.y, size.z);
        var dist = maxDim * 2.2;
        if (viewer.controls) {
          viewer.controls.target.copy(center);
          viewer.controls.radius = Math.max(dist, 0.1);
          viewer.controls.theta = -Math.PI / 2;
          viewer.controls.phi = Math.PI / 2;
          updatePointcloudCameraFromSpherical(viewer);
        } else {
          viewer.camera.position.set(center.x + dist, center.y + dist, center.z + dist);
          viewer.camera.lookAt(center);
        }
      }

      function updatePointcloudCameraFromSpherical(viewer) {
        if (!viewer || !viewer.controls || !viewer.camera) return;
        var r = viewer.controls.radius;
        var theta = viewer.controls.theta;
        var phi = viewer.controls.phi;
        var sinPhi = Math.sin(phi);
        var x = viewer.controls.target.x + r * sinPhi * Math.cos(theta);
        var y = viewer.controls.target.y + r * sinPhi * Math.sin(theta);
        var z = viewer.controls.target.z + r * Math.cos(phi);
        viewer.camera.position.set(x, y, z);
        viewer.camera.lookAt(viewer.controls.target);
      }

      function buildPointcloudAxes(length) {
        var group = new THREE.Group();
        var origin = new THREE.Vector3(0, 0, 0);
        var xEnd = new THREE.Vector3(length, 0, 0);
        var yEnd = new THREE.Vector3(0, length, 0);
        var zEnd = new THREE.Vector3(0, 0, length);

        function addAxisLine(start, end, color) {
          var geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
          var material = new THREE.LineBasicMaterial({ color: color });
          var line = new THREE.Line(geometry, material);
          group.add(line);
        }

        function addAxisLabel(text, position, color) {
          var canvas = document.createElement('canvas');
          var size = 128;
          canvas.width = size;
          canvas.height = size;
          var ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, size, size);
          ctx.font = 'bold 64px Arial';
          ctx.fillStyle = color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, size / 2, size / 2);
          var texture = new THREE.CanvasTexture(canvas);
          texture.needsUpdate = true;
          var material = new THREE.SpriteMaterial({ map: texture, transparent: true });
          var sprite = new THREE.Sprite(material);
          sprite.scale.set(0.12, 0.12, 0.12);
          sprite.position.copy(position);
          group.add(sprite);
        }

        addAxisLine(origin, xEnd, 0xff0000);
        addAxisLine(origin, yEnd, 0x00ff00);
        addAxisLine(origin, zEnd, 0x0000ff);

        addAxisLabel('X', xEnd.clone().multiplyScalar(1.05), '#ff0000');
        addAxisLabel('Y', yEnd.clone().multiplyScalar(1.05), '#00ff00');
        addAxisLabel('Z', zEnd.clone().multiplyScalar(1.05), '#0000ff');

        return group;
      }

      function pointcloudCentroid(points) {
        var count = Math.floor(points.length / 3);
        var cx = 0;
        var cy = 0;
        var cz = 0;
        for (var i = 0; i < count; i++) {
          cx += points[i * 3 + 0];
          cy += points[i * 3 + 1];
          cz += points[i * 3 + 2];
        }
        return [cx / count, cy / count, cz / count];
      }

      function applyRotationCentered(points, center, matrix) {
        var out = new Float32Array(points.length);
        for (var i = 0; i < points.length; i += 3) {
          var x = points[i + 0] - center[0];
          var y = points[i + 1] - center[1];
          var z = points[i + 2] - center[2];
          out[i + 0] = matrix[0] * x + matrix[1] * y + matrix[2] * z;
          out[i + 1] = matrix[3] * x + matrix[4] * y + matrix[5] * z;
          out[i + 2] = matrix[6] * x + matrix[7] * y + matrix[8] * z;
        }
        return out;
      }

      function applyRotationAndTranslation(points, matrix, translation) {
        var out = new Float32Array(points.length);
        for (var i = 0; i < points.length; i += 3) {
          var x = points[i + 0];
          var y = points[i + 1];
          var z = points[i + 2];
          out[i + 0] = matrix[0] * x + matrix[1] * y + matrix[2] * z + translation[0];
          out[i + 1] = matrix[3] * x + matrix[4] * y + matrix[5] * z + translation[1];
          out[i + 2] = matrix[6] * x + matrix[7] * y + matrix[8] * z + translation[2];
        }
        return out;
      }

      function transposeMatrix3(matrix) {
        return [
          matrix[0], matrix[3], matrix[6],
          matrix[1], matrix[4], matrix[7],
          matrix[2], matrix[5], matrix[8]
        ];
      }

      function randomRotationMatrix() {
        var u1 = Math.random();
        var u2 = Math.random();
        var u3 = Math.random();
        var sqrt1MinusU1 = Math.sqrt(1 - u1);
        var sqrtU1 = Math.sqrt(u1);
        var qx = sqrt1MinusU1 * Math.sin(2 * Math.PI * u2);
        var qy = sqrt1MinusU1 * Math.cos(2 * Math.PI * u2);
        var qz = sqrtU1 * Math.sin(2 * Math.PI * u3);
        var qw = sqrtU1 * Math.cos(2 * Math.PI * u3);
        var xx = qx * qx;
        var yy = qy * qy;
        var zz = qz * qz;
        var xy = qx * qy;
        var xz = qx * qz;
        var yz = qy * qz;
        var wx = qw * qx;
        var wy = qw * qy;
        var wz = qw * qz;
        return [
          1 - 2 * (yy + zz), 2 * (xy - wz), 2 * (xz + wy),
          2 * (xy + wz), 1 - 2 * (xx + zz), 2 * (yz - wx),
          2 * (xz - wy), 2 * (yz + wx), 1 - 2 * (xx + yy)
        ];
      }

      function loadStepPointcloudData(base, prefix, stepIdx) {
        var cacheKey = base + '|' + prefix + '|' + stepIdx;
        if (pointcloudState.cache[cacheKey]) {
          return pointcloudState.cache[cacheKey];
        }
        var folder = base + '/' + prefix + '_' + stepIdx;
        var partAUrl = folder + '/partA-pc.npy';
        var baseUrl = folder + '/base_partB-pc.npy';
        pointcloudState.cache[cacheKey] = Promise.all([loadNpy(partAUrl), loadNpy(baseUrl)])
          .then(function (results) {
            var partA = npyToFloat32(results[0]);
            var partB = npyToFloat32(results[1]);
            if (!partA || !partB) {
              throw new Error('Invalid point cloud content');
            }
            return {
              partA: partA,
              partB: partB,
              center: pointcloudCentroid(partA)
            };
          });
        return pointcloudState.cache[cacheKey];
      }

      function renderPointcloudSet(viewer, partA, partB) {
        if (!viewer) return;
        clearPointcloudPoints(viewer);
        var partAObj = arrayToPoints(partA, 0xff6b6b);
        var partBObj = arrayToPoints(partB, 0x4dabf7);
        if (partAObj) { viewer.scene.add(partAObj); viewer.points.push(partAObj); }
        if (partBObj) { viewer.scene.add(partBObj); viewer.points.push(partBObj); }
        fitPointcloudCamera(viewer);
      }

      function formatPredictionValues(translation, rotation) {
        return [
          translation[0], translation[1], translation[2],
          rotation[0], rotation[3], rotation[6],
          rotation[1], rotation[4], rotation[7]
        ];
      }

      function formatPredictionValueText(values) {
        return values.map(function (value) {
          return Number(value).toFixed(4);
        }).join(', ');
      }

      function mapPoseValueToToken(value) {
        var clamped = Math.max(-1, Math.min(1, Number(value) || 0));
        var index = Math.round((clamped + 1) * 100);
        return '<assemble_pose_' + index + '>';
      }

      function formatPredictionTokenText(values) {
        return values.map(function (value, idx) {
          return 'd' + (idx + 1) + ': ' + mapPoseValueToToken(value);
        }).join(', ');
      }

      function updatePointcloudPredictionDisplay(values) {
        if (typeof values === 'string') {
          if (pointcloudPredictionValues) {
            pointcloudPredictionValues.textContent = values;
          }
          if (pointcloudPredictionTokens) {
            pointcloudPredictionTokens.textContent = values;
          }
          return;
        }
        if (pointcloudPredictionValues) {
          pointcloudPredictionValues.textContent = values && values.length ? formatPredictionValueText(values) : 'N/A';
        }
        if (pointcloudPredictionTokens) {
          pointcloudPredictionTokens.textContent = values && values.length ? formatPredictionTokenText(values) : 'N/A';
        }
      }

      function updatePointcloudDemonstration(randomize) {
        var sample = pointcloudState.sample;
        if (!sample) return;
        ensurePointcloudViewers();
        var transform = pointcloudState.transform;
        if (randomize || !transform) {
          transform = {
            inputRotation: randomRotationMatrix()
          };
          transform.predictionRotation = transposeMatrix3(transform.inputRotation);
          transform.translation = sample.center.slice();
          pointcloudState.transform = transform;
        }
        var inputPartA = applyRotationCentered(sample.partA, sample.center, transform.inputRotation);
        var predictionPartA = applyRotationAndTranslation(inputPartA, transform.predictionRotation, transform.translation);
        transform.predictionPartA = predictionPartA;
        transform.predictionValues = formatPredictionValues(transform.translation, transform.predictionRotation);
        renderPointcloudSet(pointcloudViewers.target, sample.partA, sample.partB);
        renderPointcloudSet(pointcloudViewers.input, inputPartA, null);
        renderPointcloudSet(pointcloudViewers.prediction, null, sample.partB);
        updatePointcloudPredictionDisplay(transform.predictionValues);
        setPointcloudStatus('');
      }

      function renderPointcloudViewer(base, prefix, stepIdx) {
        if (!pointcloudViewerTarget || !pointcloudViewerInput || !pointcloudViewerPrediction) return;
        ensurePointcloudViewers();
        clearPointcloudPoints(pointcloudViewers.target);
        clearPointcloudPoints(pointcloudViewers.input);
        clearPointcloudPoints(pointcloudViewers.prediction);
        pointcloudState.sample = null;
        pointcloudState.transform = null;
        updatePointcloudPredictionDisplay('Loading...');
        setPointcloudStatus('Loading point clouds...');
        var token = ++pointcloudState.requestToken;
        loadStepPointcloudData(base, prefix, stepIdx)
          .then(function (sample) {
            if (token !== pointcloudState.requestToken || pointcloudState.activeStep !== stepIdx) return;
            pointcloudState.sample = sample;
            updatePointcloudDemonstration(true);
          })
          .catch(function (err) {
            console.error('Point cloud load failed:', err);
            setPointcloudStatus('Point cloud failed to load. Check console for details.');
            updatePointcloudPredictionDisplay('N/A');
          });
      }

      function renderStepButtons(steps) {
        if (!manualControls) return;
        manualControls.innerHTML = '';
        for (var i = 0; i < steps; i++) {
          (function (idx) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'interactive-step-button' + (idx === 0 ? ' is-active' : '');
            btn.textContent = 'Step ' + (idx + 1);
            btn.setAttribute('aria-label', 'Show step ' + (idx + 1));
            btn.addEventListener('click', function () {
              setActiveManualStep(idx);
            });
            manualControls.appendChild(btn);
          })(i);
        }
      }

      function setActiveManualStep(stepIdx) {
        if (!manualState.base || !manualState.prefix || !manualState.steps) return;
        if (stepIdx < 0 || stepIdx >= manualState.steps) return;
        manualState.activeStep = stepIdx;
        updateManualStepLabel(stepIdx);
        if (manualControls) {
          Array.from(manualControls.querySelectorAll('.interactive-step-button')).forEach(function (btn, idx) {
            btn.classList.toggle('is-active', idx === stepIdx);
          });
        }
        if (manualMagnifier && manualMagnifier.hideAll) manualMagnifier.hideAll();
        updateManualImages(manualState.base, manualState.prefix, stepIdx, 'manual');

        if (instructionState.data && instructionState.data.steps) {
          instructionState.activeStep = stepIdx;
          updateInstructionStepLabel(stepIdx);
          renderInstructions(stepIdx);
        }

        if (pointcloudState.base && pointcloudState.prefix) {
          pointcloudState.activeStep = stepIdx;
          updatePointcloudStepLabel(stepIdx);
          renderPointcloudViewer(pointcloudState.base, pointcloudState.prefix, stepIdx);
        }
      }

      function renderInstructions(stepIdx) {
        if (!instructionState.data || !instructionState.data.steps) return;
        var list = instructionState.data.steps || [];
        var item = list.find(function (entry) {
          return entry && typeof entry.step !== 'undefined' && entry.step === stepIdx + 1;
        }) || list[stepIdx];
        if (!item) return;
        if (instructionPrecise) instructionPrecise.textContent = item.precise_instruction || 'N/A';
        if (instructionVague) instructionVague.textContent = item.vague_instruction || 'N/A';
      }

      function loadInstructionData(url, prefix, steps) {
        return fetch(url)
          .then(function (res) {
            if (!res.ok) throw new Error('Failed to fetch instructions');
            return res.json();
          })
          .then(function (data) {
            var keys = data ? Object.keys(data) : [];
            var list = data && data[prefix] ? data[prefix] : [];
            if ((!list || !list.length) && keys.length) {
              list = data[keys[0]] || [];
            }
            instructionState.data = { steps: list };
            instructionState.steps = steps;
            return list;
          });
      }

      function applyManualConfig(button, label) {
        if (!manualRoles.length) return;
        var base = button.getAttribute('data-manual-base');
        var prefix = button.getAttribute('data-manual-prefix');
        var stepsRaw = button.getAttribute('data-manual-steps');
        var steps = stepsRaw ? parseInt(stepsRaw, 10) : 0;
        var stylePrefix = button.getAttribute('data-manual-style-prefix');
        if (stylePrefix === null || typeof stylePrefix === 'undefined') {
          stylePrefix = 'manual_';
        }
        var pcBase = button.getAttribute('data-pointcloud-base');
        var pcPrefix = button.getAttribute('data-pointcloud-prefix');
        var pcStepsRaw = button.getAttribute('data-pointcloud-steps');
        var pcSteps = pcStepsRaw ? parseInt(pcStepsRaw, 10) : steps;
        var instructionUrl = button.getAttribute('data-instruction-url');
        if (!base || !prefix || !steps || isNaN(steps)) {
          manualState = { base: '', prefix: '', steps: 0, activeStep: 0, stylePrefix: 'manual_' };
          setManualPlaceholderText('Assembly steps are not available for this asset.');
          setManualVisible(false);
          instructionState = { url: '', steps: 0, activeStep: 0, data: null };
          setInstructionPlaceholderText('Instructions are not available for this asset.');
          setInstructionVisible(false);
          pointcloudState = { base: '', prefix: '', steps: 0, activeStep: 0, cache: pointcloudState.cache || {}, requestToken: pointcloudState.requestToken || 0, sample: null, transform: null };
          setPointcloudPlaceholderText('Point cloud is not available for this asset.');
          setPointcloudVisible(false);
          return;
        }
        manualState = { base: base, prefix: prefix, steps: steps, activeStep: 0, stylePrefix: stylePrefix };
        renderStepButtons(steps);
        setManualVisible(true);
        renderManualOverview(base, prefix, steps, label);
        updateManualStepLabel(0);
        updateManualImages(base, prefix, 0, label);

        if (instructionUrl) {
          instructionState = { url: instructionUrl, steps: steps, activeStep: 0, data: null };
          setInstructionPlaceholderText('Loading instructions...');
          setInstructionVisible(false);
          updateInstructionStepLabel(0);
          loadInstructionData(instructionUrl, prefix, steps)
            .then(function (list) {
              if (!list || !list.length) {
                setInstructionPlaceholderText('Instructions are not available for this asset.');
                setInstructionVisible(false);
                return;
              }
              setInstructionVisible(true);
              renderInstructions(0);
            })
            .catch(function () {
              instructionState = { url: '', steps: 0, activeStep: 0, data: null };
              setInstructionPlaceholderText('Instructions are not available for this asset.');
              setInstructionVisible(false);
            });
        } else {
          instructionState = { url: '', steps: 0, activeStep: 0, data: null };
          setInstructionPlaceholderText('Instructions are not available for this asset.');
          setInstructionVisible(false);
        }

        if (pcBase && pcPrefix && pcSteps && !isNaN(pcSteps)) {
          pointcloudState = { base: pcBase, prefix: pcPrefix, steps: pcSteps, activeStep: 0, cache: pointcloudState.cache || {}, requestToken: pointcloudState.requestToken || 0, sample: null, transform: null };
          setPointcloudVisible(true);
          updatePointcloudStepLabel(0);
          renderPointcloudViewer(pcBase, pcPrefix, 0);
        } else {
          pointcloudState = { base: '', prefix: '', steps: 0, activeStep: 0, cache: pointcloudState.cache || {}, requestToken: pointcloudState.requestToken || 0, sample: null, transform: null };
          setPointcloudPlaceholderText('Point cloud is not available for this asset.');
          setPointcloudVisible(false);
        }
      }

      if (pointcloudRandomize) {
        pointcloudRandomize.addEventListener('click', function () {
          if (!pointcloudState.sample) return;
          updatePointcloudDemonstration(true);
        });
      }

      var activeIdx = -1;
      function activate(idx) {
        if (idx < 0 || idx >= thumbs.length) return;
        activeIdx = idx;
        thumbs.forEach(function (btn, i) { btn.classList.toggle('is-active', i === idx); btn.setAttribute('aria-pressed', i === idx ? 'true' : 'false'); });
        interactiveDots.forEach(function (dot, i) { dot.classList.toggle('is-active', i === idx); });
        var button = thumbs[idx]; var base = button.getAttribute('data-base'); var label = button.getAttribute('data-label') || '';
        var cameraPred = getInteractiveCamera(button, 'pred');
        var cameraGt = getInteractiveCamera(button, 'gt');
        if (!base) return;
        if (interactiveMagnifier && interactiveMagnifier.hideAll) interactiveMagnifier.hideAll();
        if (manualMagnifier && manualMagnifier.hideAll) manualMagnifier.hideAll();
        updateImages(base, label);
      applyManualConfig(button, label);
	        if (predFrame && predFrame.dataset.base !== base) { predFrame.src = buildViewerSrc(base, 'scene-pred.viser', cameraPred, null, true); predFrame.dataset.base = base; }
	        if (gtFrame && gtFrame.dataset.base !== base) { gtFrame.src = buildViewerSrc(base, 'scene-gt.viser', cameraGt, null, true); gtFrame.dataset.base = base; }
	        setViewerBanner(predBanner, false);
	        setViewerBanner(gtBanner, false);
	        setViewerHintVisible(predFrame, true);
	        setViewerHintVisible(gtFrame, true);
	        setViewerPlaybackDock(predFrame, true);
	        setViewerPlaybackDock(gtFrame, true);
	      }

      // Bind thumb clicks
      thumbs.forEach(function (btn, idx) { btn.addEventListener('click', function () { activate(idx); }); });
      // Bind arrows scoped to this carousel
      container.querySelectorAll('.interactive-arrow').forEach(function (arrow) {
        arrow.addEventListener('click', function (event) {
          event.preventDefault();
          var direction = arrow.getAttribute('data-direction') === 'prev' ? -1 : 1;
          var next = activeIdx < 0 ? (direction === -1 ? thumbs.length - 1 : 0) : (activeIdx + direction + thumbs.length) % thumbs.length;
          activate(next);
          if (thumbs[next]) {
            thumbs[next].focus();
            if (thumbRow) {
              var rowRect = thumbRow.getBoundingClientRect();
              var thumbRect = thumbs[next].getBoundingClientRect();
              if (thumbRect.left < rowRect.left || thumbRect.right > rowRect.right) {
                thumbs[next].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
              }
            }
          }
        });
      });

      // Initialize magnifier for this inputs grid
      if (interactiveMagnifier) interactiveMagnifier.init();

      var api = { activate: activate, getActiveIndex: function () { return activeIdx; } };
      if (opts.autoActivate) activate(0);
      return api;
    }

    // Initialize both carousels (stacked, always visible)
    var droidApi = initOneCarousel({
      container: document.getElementById('interactive-row-droid'),
      thumbRowSelector: '#interactive-thumb-row-droid',
      dotsSelector: '#interactive-dots-droid',
      inputsCardId: 'interactive-inputs-droid',
      imageRoles: ['rgb0','depth0','rgb1','depth1'],
      manualRoles: ['colored-before','colored-after','freestyle-before','freestyle-after','lineart-before','lineart-after','nonfreestyle-before','nonfreestyle-after'],
      autoActivate: false
    });
    var dailyApi = initOneCarousel({
      container: document.getElementById('interactive-row-daily'),
      thumbRowSelector: '#interactive-thumb-row-daily',
      dotsSelector: '#interactive-dots-daily',
      inputsCardId: 'interactive-inputs-droid',
      imageRoles: ['rgb0','depth0','rgb1','depth1'],
      manualRoles: ['colored-before','colored-after','freestyle-before','freestyle-after','lineart-before','lineart-after','nonfreestyle-before','nonfreestyle-after'],
      autoActivate: false
    });
    var fragmentsApi = initOneCarousel({
      container: document.getElementById('interactive-row-fragments'),
      thumbRowSelector: '#interactive-thumb-row-fragments',
      dotsSelector: '#interactive-dots-fragments',
      inputsCardId: 'interactive-inputs-droid',
      imageRoles: ['rgb0','depth0','rgb1','depth1'],
      manualRoles: ['colored-before','colored-after','freestyle-before','freestyle-after','lineart-before','lineart-after','nonfreestyle-before','nonfreestyle-after'],
      autoActivate: false
    });
    var b1kApi = initOneCarousel({
      container: document.getElementById('interactive-row-b1k'),
      thumbRowSelector: '#interactive-thumb-row-b1k',
      dotsSelector: '#interactive-dots-b1k',
      inputsCardId: 'interactive-inputs-b1k',
      imageRoles: ['rgb0','rgb1','rgb2','depth0','depth1','depth2'],
      autoActivate: false
    });

    // Show inputs card matching the last interacted carousel
    function showInputs(which) {
      var isDroid = which === 'droid';
      document.getElementById('interactive-inputs-droid').classList.toggle('is-hidden', !isDroid);
      document.getElementById('interactive-inputs-b1k').classList.toggle('is-hidden', isDroid);
    }
    showInputs('droid');

    // Keep B1K tile size roughly matching DROID tile size
    function syncB1KGridWidth() {
      var droidGrid = document.querySelector('#interactive-inputs-droid .interactive-image-grid');
      var b1kGrid = document.querySelector('#interactive-inputs-b1k .interactive-image-grid--b1k');
      if (!droidGrid || !b1kGrid) return;
      var firstDroidImg = droidGrid.querySelector('img');
      if (!firstDroidImg) return;
      var tileW = firstDroidImg.clientWidth;
      if (!tileW) return;
      var gapPx = 0;
      try {
        var cs = window.getComputedStyle(droidGrid);
        var gap = cs.getPropertyValue('gap') || cs.getPropertyValue('grid-gap') || '0px';
        gapPx = parseFloat(gap);
        if (isNaN(gapPx)) gapPx = 0;
      } catch (e) {}
      var desired = Math.round((tileW * 3) + (gapPx * 2));
      // Set a max-width so it fits on small screens while matching on larger ones
      b1kGrid.style.maxWidth = desired + 'px';
      b1kGrid.style.width = '100%';
      b1kGrid.style.marginLeft = 'auto';
      b1kGrid.style.marginRight = 'auto';
    }
    // Run after layout settles
    setTimeout(syncB1KGridWidth, 0);
    window.addEventListener('resize', syncB1KGridWidth);
    // Wire up listeners so clicking in a row also flips inputs card
    var droidRow = document.getElementById('interactive-row-droid');
    var dailyRow = document.getElementById('interactive-row-daily');
    var fragmentsRow = document.getElementById('interactive-row-fragments');
    var b1kRow = document.getElementById('interactive-row-b1k');
    if (droidRow) droidRow.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.interactive-thumb')) {
        showInputs('droid');
      }
    });
    if (dailyRow) dailyRow.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.interactive-thumb')) {
        showInputs('droid');
      }
    });
    if (fragmentsRow) fragmentsRow.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.interactive-thumb')) {
        showInputs('droid');
      }
    });
    if (b1kRow) b1kRow.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.interactive-thumb')) {
        // ensure first b1k sample is activated on first interaction
        if (b1kApi && b1kApi.getActiveIndex && b1kApi.getActiveIndex() === 0) {
          // activate(0) may already be called; safe to call again
        }
        showInputs('b1k');
      }
    });

    window.addEventListener('resize', function () {
      Array.from(document.querySelectorAll('[data-pointcloud-viewer-target], [data-pointcloud-viewer-input], [data-pointcloud-viewer-prediction]')).forEach(function (viewer) {
        if (viewer && viewer._pointcloudResize) {
          viewer._pointcloudResize();
        }
      });
    });
  }

  function initDatasetSection() {
    var section = document.getElementById('dataset');
    if (!section) {
      return;
    }
    var datasetThumbs = Array.from(section.querySelectorAll('.dataset-thumb'));
    if (!datasetThumbs.length) {
      return;
    }

    var activeIdx = -1; // no default sample selected
    var thumbRow = section.querySelector('#dataset-thumb-row');
    var dotsContainer = section.querySelector('#dataset-dots');
    var datasetDots = [];
    if (dotsContainer) {
      dotsContainer.innerHTML = '';
      datasetDots = datasetThumbs.map(function (_, idx) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'carousel-dot' + (idx === activeIdx ? ' is-active' : '');
        dot.setAttribute('aria-label', 'Show dataset sample ' + (idx + 1));
        dot.addEventListener('click', function () {
          activateDatasetSample(idx);
        });
        dotsContainer.appendChild(dot);
        return dot;
      });
    }
	    var oursViewer = document.getElementById('dataset-viewer-ours');
	    var originalViewer = document.getElementById('dataset-viewer-original');
	    var oursBanner = getViewerBanner(oursViewer);
	    var originalBanner = getViewerBanner(originalViewer);
	    setViewerBanner(oursBanner, true);
	    setViewerBanner(originalBanner, true);
	    setViewerHintVisible(oursViewer, false);
	    setViewerHintVisible(originalViewer, false);
    var imageMap = {
      'ours-rgb-0': section.querySelector('[data-dataset-role="ours-rgb-0"]'),
      'ours-depth-0': section.querySelector('[data-dataset-role="ours-depth-0"]'),
      'ours-rgb-1': section.querySelector('[data-dataset-role="ours-rgb-1"]'),
      'ours-depth-1': section.querySelector('[data-dataset-role="ours-depth-1"]'),
      'original-rgb-0': section.querySelector('[data-dataset-role="original-rgb-0"]'),
      'original-depth-0': section.querySelector('[data-dataset-role="original-depth-0"]'),
      'original-rgb-1': section.querySelector('[data-dataset-role="original-rgb-1"]'),
      'original-depth-1': section.querySelector('[data-dataset-role="original-depth-1"]')
    };

    // --- Synchronized magnifier setup for Calibrated RGB + Depth ---
    var magnifier = (function () {
      var zoom = 2.5; // magnification factor
      var lensSize = 180; // must match CSS width/height
      var lensByKey = {}; // key: 'rgb-0' | 'depth-0' | 'rgb-1' | 'depth-1'

      function ensureLenses(key) {
        if (!lensByKey[key]) {
          var lensOurs = document.createElement('div');
          lensOurs.className = 'dataset-magnifier-lens is-hidden';
          var lensOrig = document.createElement('div');
          lensOrig.className = 'dataset-magnifier-lens is-hidden';
          document.body.appendChild(lensOurs);
          document.body.appendChild(lensOrig);
          lensByKey[key] = { ours: lensOurs, original: lensOrig };
        }
        return lensByKey[key];
      }

      function hideAll() {
        Object.keys(lensByKey).forEach(function (k) {
          var pair = lensByKey[k];
          if (pair && pair.ours) pair.ours.classList.add('is-hidden');
          if (pair && pair.original) pair.original.classList.add('is-hidden');
        });
      }

      function roleToKey(role) {
        // role is like 'ours-rgb-0' -> returns { key: 'rgb-0', side: 'ours' }
        var parts = role.split('-');
        if (parts.length < 3) return { key: role, side: '' };
        var side = parts[0];
        var key = parts.slice(1).join('-');
        return { key: key, side: side };
      }

      function pairedRole(role) {
        var info = roleToKey(role);
        var otherSide = info.side === 'ours' ? 'original' : 'ours';
        return otherSide + '-' + info.key;
      }

      function computeDisplayPos(img, clientX, clientY) {
        var rect = img.getBoundingClientRect();
        var x = clientX - rect.left; // in displayed px
        var y = clientY - rect.top;
        // clamp inside image bounds
        x = Math.max(0, Math.min(rect.width, x));
        y = Math.max(0, Math.min(rect.height, y));
        return { x: x, y: y, rect: rect };
      }

      function applyLens(lens, img, dispPos) {
        // background sizing based on displayed size keeps mapping simple
        var bgSize = (dispPos.rect.width * zoom) + 'px ' + (dispPos.rect.height * zoom) + 'px';
        var bgPosX = -(dispPos.x * zoom - lensSize / 2);
        var bgPosY = -(dispPos.y * zoom - lensSize / 2);
        lens.style.backgroundImage = 'url("' + (img.currentSrc || img.src) + '")';
        lens.style.backgroundSize = bgSize;
        lens.style.backgroundPosition = bgPosX + 'px ' + bgPosY + 'px';
      }

      function placeLensNearPoint(lens, viewportX, viewportY) {
        var offset = 12; // px
        var left = viewportX + offset;
        var top = viewportY - lensSize / 2;
        // flip horizontally if overflowing viewport
        if (left + lensSize > window.innerWidth - 8) {
          left = viewportX - lensSize - offset;
        }
        // clamp vertically
        top = Math.max(8, Math.min(window.innerHeight - lensSize - 8, top));
        lens.style.left = Math.round(left) + 'px';
        lens.style.top = Math.round(top) + 'px';
      }

      function onMove(evt, role) {
        var srcImg = imageMap[role];
        var pairRole = pairedRole(role);
        var dstImg = imageMap[pairRole];
        if (!srcImg || !dstImg) return;

        var info = roleToKey(role);
        var lenses = ensureLenses(info.key);
        var srcLens = info.side === 'ours' ? lenses.ours : lenses.original;
        var dstLens = info.side === 'ours' ? lenses.original : lenses.ours;

        // positions in displayed coordinates for both images
        var srcDisp = computeDisplayPos(srcImg, evt.clientX, evt.clientY);
        // map proportionally onto the paired image
        var ratioX = srcDisp.x / (srcDisp.rect.width || 1);
        var ratioY = srcDisp.y / (srcDisp.rect.height || 1);
        var dstRect = dstImg.getBoundingClientRect();
        var dstX = ratioX * dstRect.width;
        var dstY = ratioY * dstRect.height;

        // update the lenses' backgrounds
        applyLens(srcLens, srcImg, srcDisp);
        applyLens(dstLens, dstImg, { x: dstX, y: dstY, rect: dstRect });

        // place lenses near their respective points
        placeLensNearPoint(srcLens, srcDisp.rect.left + srcDisp.x, srcDisp.rect.top + srcDisp.y);
        placeLensNearPoint(dstLens, dstRect.left + dstX, dstRect.top + dstY);

        srcLens.classList.remove('is-hidden');
        dstLens.classList.remove('is-hidden');
      }

      function onLeave(role) {
        var info = roleToKey(role);
        var lenses = ensureLenses(info.key);
        if (lenses.ours) lenses.ours.classList.add('is-hidden');
        if (lenses.original) lenses.original.classList.add('is-hidden');
      }

      function bind(img, role) {
        if (!img) return;
        img.addEventListener('mouseenter', function (e) { onMove(e, role); });
        img.addEventListener('mousemove', function (e) { onMove(e, role); });
        img.addEventListener('mouseleave', function () { onLeave(role); });
        // also hide on scroll to avoid stray lenses
        window.addEventListener('scroll', function () { onLeave(role); }, { passive: true });
        window.addEventListener('resize', function () { onLeave(role); });
      }

      function init() {
        ['rgb-0', 'depth-0', 'rgb-1', 'depth-1'].forEach(function (key) {
          bind(imageMap['ours-' + key], 'ours-' + key);
          bind(imageMap['original-' + key], 'original-' + key);
        });
      }

      return { init: init, hideAll: hideAll };
    })();

    function getDatasetCamera(button) {
      if (!button) {
        return DEFAULT_CAMERA;
      }
      return {
        position: button.getAttribute('data-camera-position') || DEFAULT_CAMERA.position,
        lookAt: button.getAttribute('data-camera-lookat') || DEFAULT_CAMERA.lookAt,
        up: button.getAttribute('data-camera-up') || DEFAULT_CAMERA.up
      };
    }

    function updateDatasetImages(base, label) {
      var labelText = label || 'Dataset sample';
      var mappings = [
        ['ours-rgb-0', base + '/fs-refined/rgb_robot/cam0.png', 'ours RGB cam0'],
        ['ours-depth-0', base + '/fs-refined/depth/cam0.png', 'ours depth cam0'],
        ['ours-rgb-1', base + '/fs-refined/rgb_robot/cam1.png', 'ours RGB cam1'],
        ['ours-depth-1', base + '/fs-refined/depth/cam1.png', 'ours depth cam1'],
        ['original-rgb-0', base + '/raw-tri/rgb_robot/cam0.png', 'original RGB cam0'],
        ['original-depth-0', base + '/raw-tri/depth/cam0.png', 'original depth cam0'],
        ['original-rgb-1', base + '/raw-tri/rgb_robot/cam1.png', 'original RGB cam1'],
        ['original-depth-1', base + '/raw-tri/depth/cam1.png', 'original depth cam1']
      ];
      mappings.forEach(function (entry) {
        var role = entry[0];
        var src = entry[1];
        var altSuffix = entry[2];
        var img = imageMap[role];
        if (img) {
          img.src = src;
          img.alt = labelText + ' ' + altSuffix;
        }
      });
    }

    function activateDatasetSample(index) {
      if (index < 0 || index >= datasetThumbs.length) {
        return;
      }
      activeIdx = index;
      datasetThumbs.forEach(function (btn, idx) {
        btn.classList.toggle('is-active', idx === index);
        btn.setAttribute('aria-pressed', idx === index ? 'true' : 'false');
      });
      datasetDots.forEach(function (dot, idx) {
        dot.classList.toggle('is-active', idx === index);
      });
      var button = datasetThumbs[index];
      var base = button.getAttribute('data-base');
      var label = button.getAttribute('data-label') || '';
      var camera = getDatasetCamera(button);
      if (!base) {
        return;
      }
      updateDatasetImages(base, label);
      // hide magnifiers when switching samples
      if (magnifier && magnifier.hideAll) { magnifier.hideAll(); }
	      if (oursViewer && oursViewer.dataset.base !== base) {
	        oursViewer.src = buildViewerSrc(base, 'scene-fs-refined.viser', camera);
	        oursViewer.dataset.base = base;
	      }
	      if (originalViewer && originalViewer.dataset.base !== base) {
	        originalViewer.src = buildViewerSrc(base, 'scene-raw-tri.viser', camera);
	        originalViewer.dataset.base = base;
	      }
	      setViewerBanner(oursBanner, false);
	      setViewerBanner(originalBanner, false);
	      setViewerHintVisible(oursViewer, true);
	      setViewerHintVisible(originalViewer, true);
	    }

    datasetThumbs.forEach(function (btn, idx) {
      btn.addEventListener('click', function () {
        activateDatasetSample(idx);
      });
    });

    section.querySelectorAll('.dataset-arrow').forEach(function (arrow) {
      arrow.addEventListener('click', function (event) {
        event.preventDefault();
        var direction = arrow.getAttribute('data-direction') === 'prev' ? -1 : 1;
        var next = activeIdx < 0 ? (direction === -1 ? datasetThumbs.length - 1 : 0) : (activeIdx + direction + datasetThumbs.length) % datasetThumbs.length;
        activateDatasetSample(next);
        if (datasetThumbs[next]) {
          datasetThumbs[next].focus();
        }
        if (thumbRow && datasetThumbs[next]) {
          var nextThumb = datasetThumbs[next];
          var rowRect = thumbRow.getBoundingClientRect();
          var thumbRect = nextThumb.getBoundingClientRect();
          if (thumbRect.left < rowRect.left || thumbRect.right > rowRect.right) {
            nextThumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }
        }
      });
    });

    if (oursViewer) {
      oursViewer.removeAttribute('src');
      oursViewer.dataset.base = '';
    }
    if (originalViewer) {
      originalViewer.removeAttribute('src');
      originalViewer.dataset.base = '';
    }

    // Initialize synchronized magnifiers for calibrated inputs
    if (magnifier) {
      magnifier.init();
    }
  }
});
