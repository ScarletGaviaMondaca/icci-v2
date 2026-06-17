import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Practica1 } from './practica1';

describe('Practica1', () => {
  let component: Practica1;
  let fixture: ComponentFixture<Practica1>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Practica1],
    }).compileComponents();

    fixture = TestBed.createComponent(Practica1);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
