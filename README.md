# Fluid simulator

This repo is still under development, so there are bugds in the code
[https://sam-martis.github.io/EulerianFluidSimulator/](https://sam-martis.github.io/EulerianFluidSimulator/)


How it works(in short):
When we attempt to numerically solve a differential equation, it is often useful to do it steps.
Say,
$$\frac{dq}{dt} = f(q)+g(q)$$
We solve this as follows:

$$q' = q^n + \Delta t f(q^n)$$

$$q^{n+1} = q' + \Delta t g({q'}^n)$$


We do this in steps because we can use specialized and optimized functions for solving $f$ and $g$, respectively.

Additionally, the output of one step could have certain properties that help in the second function.


In our case, when we want to simulate the fluid, we first make the fluid 'divergence free' and THEN move the fluid.

The first step is basically solving for incompressibility.

The second step is called advection, where we move the fluid state forward in time by a small differential time.

It is important that we advect only across a divergence-free fluid.




We break the entire simulation space into a grid. We'll be using a MAC grid.
Next, we store all the vertical velocities of the fluid at a point in the top and bottom of the grid cell where the point is.
Similarly, for horizontal velocities on the right and left.

Solving for divergence becomes easy now because we just have to make sure there is no cell with more fluid in than going out or vice versa. 

```typescript
  findDivergence = (): number => {
    return this.vl.x - this.vr.x + this.vu.y - this.vd.y;
  };
```

Once we have the divergence, we 'push' the velocities so that the divergence of the cell is minimized.

```typescript
    this.vl.increment(-OVER_RELAXATION * divergencePerVector, 0);
    this.vr.increment(OVER_RELAXATION * divergencePerVector, 0);
    this.vu.increment(0, -OVER_RELAXATION * divergencePerVector);
    this.vd.increment(0, OVER_RELAXATION * divergencePerVector);
```

Overrelaxation is a technique used to speed up convergence. The OVER_RELAXATION constant is a number between 1 and 2


If we do this for all cells enough times in an iteration, we would have a fairly divergence-free field.

```typescript
  eliminateDivergence = (iterations: number = 100): void => {
    for (let k = 0; k < iterations; k++) {
      for (let i = 0; i < this.cellCount.x; i++) {
        for (let j = 0; j < this.cellCount.y; j++) {
          this.cells[j][i].makeDivergenceZero();
        }
      }
    }
  };
```


Now that we have solved the divergence, it is time to move the fluid. For this, we move the velocity values at each of the cell boundaries. This is equivalent to the whole fluid's movement.

For the advection, we basically try to do the following: If the fluid moves, some fluid packet will reach our current point. So that means if we find the state of the fluid packet, we will know what value our current value should be in the future.
So we try to find which packet of fluid would land on our point. This is called Semi-Lagrange advection.

If the velocity of our position(x) is v(x), then a first-order approximation would be that the particle that landed here would be at x - v(x)dt. I.e., the new velocity after a time it would be v(x-v(x)dt). This is correct and is a first-order method, however, we use a more accurate second-order method called Runge Kutta 2

```typescript
  advectCellVelocities = (cell: Cell, dt: number): void => {
    const l1x = cell.pos.x;
    const l1y = cell.pos.y + cell.size / 2;
    const u1x = cell.pos.x + cell.size / 2;
    const u1y = cell.pos.y;
    const r1x = cell.pos.x + cell.size;
    const r1y = cell.pos.y + cell.size / 2;
    const d1x = cell.pos.x + cell.size / 2;
    const d1y = cell.pos.y + cell.size;

    const fullVL1 = this.findVelocityAtPoint(new Vector(l1x, l1y));
    const fullVU1 = this.findVelocityAtPoint(new Vector(u1x, u1y));
    const fullVR1 = this.findVelocityAtPoint(new Vector(r1x, r1y));
    const fullVD1 = this.findVelocityAtPoint(new Vector(d1x, d1y));

    const VLdx1 = (-fullVL1.x * dt) / 2;
    const VLdy1 = (-fullVL1.y * dt) / 2;
    const VUdx1 = (-fullVU1.x * dt) / 2;
    const VUdy1 = (-fullVU1.y * dt) / 2;
    const VRdx1 = (-fullVR1.x * dt) / 2;
    const VRdy1 = (-fullVR1.y * dt) / 2;
    const VDdx1 = (-fullVD1.x * dt) / 2;
    const VDdy1 = (-fullVD1.y * dt) / 2;

    const l2x = l1x + VLdx1;
    const l2y = l1y + VLdy1;
    const u2x = u1x + VUdx1;
    const u2y = u1y + VUdy1;
    const r2x = r1x + VRdx1;
    const r2y = r1y + VRdy1;
    const d2x = d1x + VDdx1;
    const d2y = d1y + VDdy1;

    const fullVL2 = this.findVelocityAtPoint(new Vector(l2x, l2y));
    const fullVU2 = this.findVelocityAtPoint(new Vector(u2x, u2y));
    const fullVR2 = this.findVelocityAtPoint(new Vector(r2x, r2y));
    const fullVD2 = this.findVelocityAtPoint(new Vector(d2x, d2y));


    const VLdx2 = (-fullVL2.x * dt);
    const VLdy2 = (-fullVL2.y * dt);
    const VUdx2 = (-fullVU2.x * dt);
    const VUdy2 = (-fullVU2.y * dt);
    const VRdx2 = (-fullVR2.x * dt);
    const VRdy2 = (-fullVR2.y * dt);
    const VDdx2 = (-fullVD2.x * dt);
    const VDdy2 = (-fullVD2.y * dt);

    const l3x = l1x + VLdx2;
    const l3y = l1y + VLdy2;
    const u3x = u1x + VUdx2;
    const u3y = u1y + VUdy2;
    const r3x = r1x + VRdx2;
    const r3y = r1y + VRdy2;
    const d3x = d1x + VDdx2;
    const d3y = d1y + VDdy2;
    cell.vl.cacheVec(this.findVelocityAtPoint(new Vector(l3x, l3y)));
    cell.vu.cacheVec(this.findVelocityAtPoint(new Vector(u3x, u3y)));
    cell.vr.cacheVec(this.findVelocityAtPoint(new Vector(r3x, r3y)));
    cell.vd.cacheVec(this.findVelocityAtPoint(new Vector(d3x, d3y)));
  };

```



As for how we find v(x) at x, we linearly interpolate the velocity at the point from the neighbour boundary values.


This is, in essence, how one simulates fluids. I'm not covering walls cause that'll take another 20 minutes of typing. 
Exercise left for the reader :)



## Pictures
![image](https://github.com/user-attachments/assets/fb34b520-ad74-4fec-99be-cd7ecc9032c9)


![image](https://github.com/user-attachments/assets/7e04fd0f-bfb5-45a4-bafb-3a55e503404a)


![image](https://github.com/user-attachments/assets/220ed513-75d7-45f2-9cd0-d6464f6baeb3)
















