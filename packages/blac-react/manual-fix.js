const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/adapter/ReactBlocAdapter.ts', 'utf8');

// Find and replace the specific section
const oldCode = `          // Create tracked proxy
          const trackedState = this.dependencyTracker.createTrackedProxy(this.snapshot.state);

          return trackedState as S;`;

const newCode = `          // Create tracked proxy
          const trackedState = this.dependencyTracker.createTrackedProxy(this.snapshot.state);
          
          // Wrap in a proxy that completes tracking after properties are accessed
          let accessCount = 0;
          const trackingProxy = new Proxy(trackedState, {
            get: (target, prop) => {
              const value = Reflect.get(target, prop);
              accessCount++;
              
              // Complete tracking after first property access using a microtask
              // This ensures all synchronous property accesses in the render are captured
              if (accessCount === 1) {
                queueMicrotask(() => {
                  if (this.pendingTrackedStates.has(subscriptionId)) {
                    const deps = this.dependencyTracker!.stopTracking();
                    subscription.trackedDependencies = deps;
                    subscription.lastTrackedVersion = this.version;
                    this.pendingTrackedStates.delete(subscriptionId);
                    
                    if (process.env.NODE_ENV === 'development') {
                      console.log(\`[ReactBlocAdapter] Auto-completed tracking for \${subscriptionId}:\`, Array.from(deps));
                    }
                  }
                });
              }
              
              return value;
            }
          });

          return trackingProxy as S;`;

content = content.replace(oldCode, newCode);

// Write the file back
fs.writeFileSync('src/adapter/ReactBlocAdapter.ts', content);
console.log('Fixed ReactBlocAdapter.ts');
